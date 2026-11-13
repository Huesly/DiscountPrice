import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  listProducts,
  countProducts,
  getProductBySku,
  getPriceHistory,
  getPriceStats,
  getActiveDeals,
  getGlobalStats,
  getBrands,
  getCategories,
  listGroups,
  getGroupMembers,
  upsertProductsBatch,
  closePool,
} from '../db/repo.js';
import type { ProductFilters } from '../db/repo.js';
import { collectTerm, collectFoodDeals } from '../collector.js';
import { getAllD1Products } from '../stores/d1.js';
import { getAllAraProducts } from '../stores/ara.js';
import { runMatcher } from '../match.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get('/api/stats', async () => {
  return getGlobalStats();
});

app.get('/api/products', async (req) => {
  const {
    query = '',
    category = '',
    store = '',
    brands = '',
    brand = '',
    skus = '',
    minPrice,
    maxPrice,
    dealOnly,
    energyClassA,
    minDiscount,
    sort,
    limit = 24,
    offset = 0,
  } = req.query as {
    query?: string;
    category?: string;
    store?: string;
    brand?: string;
    brands?: string;
    skus?: string;
    minPrice?: string;
    maxPrice?: string;
    dealOnly?: string;
    energyClassA?: string;
    minDiscount?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  };
  const brandList = brands
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  const skuList = skus
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const filters: ProductFilters = {
    query: String(query) || undefined,
    category: String(category).trim() || undefined,
    store: String(store).trim() || undefined,
    brands: brandList.length ? brandList : undefined,
    skus: skuList.length ? skuList : undefined,
    minPrice: minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined,
    maxPrice: maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined,
    dealOnly: dealOnly === 'true' || dealOnly === '1',
    energyClassA: energyClassA === 'true' || energyClassA === '1',
    minDiscount: minDiscount !== undefined && minDiscount !== '' ? Number(minDiscount) : undefined,
    sort: sort as ProductFilters['sort'],
  };
  const [items, total] = await Promise.all([
    listProducts(filters, Number(limit), Number(offset)),
    countProducts(filters),
  ]);
  return { total, items };
});

app.get('/api/categories', async () => {
  return getCategories();
});

app.get('/api/brands', async () => {
  return getBrands();
});

app.get('/api/products/:sku', async (req, reply) => {
  const { sku } = req.params as { sku: string };
  const p = await getProductBySku(sku);
  if (!p) return reply.code(404).send({ error: 'Producto no encontrado' });
  return p;
});

app.get('/api/products/:sku/history', async (req) => {
  const { sku } = req.params as { sku: string };
  const { limit = 200 } = req.query as { limit?: number };
  return getPriceHistory(sku, Number(limit));
});

app.get('/api/products/:sku/stats', async (req) => {
  const { sku } = req.params as { sku: string };
  const [p, stats] = await Promise.all([getProductBySku(sku), getPriceStats(sku)]);
  return { product: p, stats };
});

app.post('/api/collect', async (req, reply) => {
  const q = (req.query ?? {}) as { term?: string; store?: string; city?: string; category?: string };
  const b = (req.body ?? {}) as { term?: string; store?: string; city?: string; category?: string };
  const term = q.term || b.term;
  const store = q.store || b.store || 'all';
  const city = q.city || b.city || null;
  const category = q.category || b.category;

  const t = String(term ?? '').trim();
  if (!t) return reply.code(400).send({ error: 'Falta el parámetro term' });
  try {
    const added = await collectTerm(t, 'Búsqueda', store, city, category);
    // Ejecutar matcher asíncronamente en segundo plano para responder sin retrasar la respuesta
    runMatcher(false).catch((e) => app.log.warn('Matcher background error: ' + (e as Error).message));
    return { term: t, store, added, matched: 'background' };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ error: 'Error colectando el término' });
  }
});

app.post('/api/collect/food', async (_req, reply) => {
  try {
    const res = await collectFoodDeals();
    const matched = await runMatcher(false);
    return { ...res, matched };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ error: 'Error colectando comidas y supermercado' });
  }
});

app.get('/api/deals', async (req) => {
  const { limit = 50 } = req.query as { limit?: number };
  return getActiveDeals(Number(limit));
});

app.get('/api/groups', async (req) => {
  const { query = '', limit = 20 } = req.query as { query?: string; limit?: number };
  return listGroups(query ? String(query) : undefined, Number(limit));
});

app.get('/api/groups/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const gid = Number(id);
  if (!Number.isInteger(gid) || gid <= 0) {
    return reply.code(400).send({ error: 'ID inválido' });
  }
  const members = await getGroupMembers(gid);
  if (members.length === 0) {
    return reply.code(404).send({ error: 'Grupo no encontrado' });
  }
  const minPrice = members.reduce(
    (acc, m) => (m.price !== null && (acc === null || m.price < acc) ? m.price : acc),
    null as number | null
  );
  return { id: gid, members, min_price: minPrice };
});

const host = process.env.API_HOST ?? '127.0.0.1';
const port = Number(process.env.API_PORT ?? 3100);

app.listen({ host, port }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  (async () => {
    try {
      const d1Count = await upsertProductsBatch(getAllD1Products(), { store: 'd1', city: null });
      const araCount = await upsertProductsBatch(getAllAraProducts(), { store: 'ara', city: null });
      await runMatcher(false);
      app.log.info(`Catálogos sincronizados -> D1: ${d1Count}, Ara: ${araCount}`);
    } catch (e) {
      app.log.warn(`Error sincronizando D1/Ara al inicio: ${(e as Error).message}`);
    }
  })();
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});
