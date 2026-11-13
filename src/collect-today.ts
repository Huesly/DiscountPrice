import 'dotenv/config';
import { falabellaAdapter } from './stores/falabella.js';
import { ikeaAdapter } from './stores/ikea.js';
import { exitoAdapter } from './stores/exito.js';
import { alkostoAdapter } from './stores/alkosto.js';
import { homecenterAdapter } from './stores/homecenter.js';
import { getAllD1Products } from './stores/d1.js';
import { getAllAraProducts } from './stores/ara.js';
import { upsertProductsBatch, getProductCount, getPriceHistoryCount, closePool } from './db/repo.js';
import { detectCategory } from './collector.js';
import { runMatcher } from './match.js';

const IKEA_TERMS = [
  'lampara',
  'lampara de mesa',
  'lampara de pie',
  'lampara de techo',
  'bombillo',
  'escritorio',
  'silla',
  'sofa',
  'cama',
  'colchon',
  'comedor',
  'estante',
  'closet',
  'persiana',
  'espejo',
  'mesa',
  'cortina',
  'almohada',
  'organizador',
];

const SEARCH_TERMS = [
  { term: 'freidora de aire', subcategory: 'Freidoras' },
  { term: 'airfryer', subcategory: 'Freidoras' },
  { term: 'licuadora', subcategory: 'Licuadoras' },
  { term: 'cafetera', subcategory: 'Cafeteras' },
  { term: 'nevera', subcategory: 'Refrigeración' },
  { term: 'lavadora', subcategory: 'Lavado' },
  { term: 'microondas', subcategory: 'Microondas' },
  { term: 'televisor', subcategory: 'Televisores' },
  { term: 'escritorio', subcategory: 'Muebles de Oficina' },
  { term: 'silla de oficina', subcategory: 'Sillas' },
  { term: 'arroz', subcategory: 'Granos y Despensa' },
  { term: 'aceite vegetal', subcategory: 'Aceites' },
  { term: 'leche entera', subcategory: 'Lácteos' },
  { term: 'cafe molido', subcategory: 'Café' },
  { term: 'atun', subcategory: 'Enlatados' },
  { term: 'macbook', subcategory: 'Laptops y MacBooks' },
  { term: 'macbook air', subcategory: 'Laptops y MacBooks' },
  { term: 'macbook pro', subcategory: 'Laptops y MacBooks' },
  { term: 'iphone', subcategory: 'Celulares iPhone' },
  { term: 'iphone 15', subcategory: 'Celulares iPhone' },
  { term: 'iphone 16', subcategory: 'Celulares iPhone' },
  { term: 'ipad', subcategory: 'Tablets iPad' },
  { term: 'ipad air', subcategory: 'Tablets iPad' },
  { term: 'ipad pro', subcategory: 'Tablets iPad' },
];

async function collectIkeaToday(): Promise<number> {
  console.log('\n[1/5] Actualizando catálogo de IKEA Cali (Lámparas, Hogar y Muebles)...');
  let total = 0;
  const seenSkus = new Set<string>();

  for (const term of IKEA_TERMS) {
    try {
      const items = await ikeaAdapter.fetchListing('', { term, city: 'Cali' });
      const unique = items.filter((i) => !seenSkus.has(i.sku));
      for (const i of unique) seenSkus.add(i.sku);

      if (unique.length > 0) {
        const batch = unique.map((p) => ({
          ...p,
          category: detectCategory(p.name, null, term),
          subcategory: term,
        }));
        const count = await upsertProductsBatch(batch, { store: 'ikea', city: 'Cali' });
        total += count;
        console.log(`  [IKEA Cali] "${term}": ${unique.length} obtenidos (${count} guardados)`);
      }
    } catch (e) {
      console.warn(`  [IKEA Cali] Error en "${term}": ${(e as Error).message}`);
    }
  }
  return total;
}

async function collectDiscountStoresToday(): Promise<number> {
  console.log('\n[2/5] Actualizando Tiendas D1 y Tiendas Ara...');
  let total = 0;

  try {
    const d1Items = await getAllD1Products();
    if (d1Items.length > 0) {
      const count = await upsertProductsBatch(
        d1Items.map((p) => ({ ...p, category: detectCategory(p.name) })),
        { store: 'd1', city: 'Nacional' }
      );
      total += count;
      console.log(`  [D1] ${d1Items.length} productos obtenidos (${count} guardados)`);
    }
  } catch (e) {
    console.warn(`  [D1] Error: ${(e as Error).message}`);
  }

  try {
    const araItems = await getAllAraProducts();
    if (araItems.length > 0) {
      const count = await upsertProductsBatch(
        araItems.map((p) => ({ ...p, category: detectCategory(p.name) })),
        { store: 'ara', city: 'Nacional' }
      );
      total += count;
      console.log(`  [Ara] ${araItems.length} productos obtenidos (${count} guardados)`);
    }
  } catch (e) {
    console.warn(`  [Ara] Error: ${(e as Error).message}`);
  }

  return total;
}

async function collectMultiStoresToday(): Promise<{ falabella: number; exito: number; alkosto: number; homecenter: number }> {
  console.log('\n[3/5] Actualizando productos frescos de Falabella, Éxito, Alkosto y Homecenter...');
  let falabellaTotal = 0;
  let exitoTotal = 0;
  let alkostoTotal = 0;
  let homecenterTotal = 0;

  for (const item of SEARCH_TERMS) {
    // 1. Falabella
    try {
      const fUrl = falabellaAdapter.searchUrl(item.term);
      const fItems = await falabellaAdapter.fetchListing(fUrl);
      if (fItems.length > 0) {
        const count = await upsertProductsBatch(
          fItems.map((p) => ({
            ...p,
            category: detectCategory(p.name, item.subcategory, item.term),
            subcategory: item.subcategory,
          })),
          { store: 'falabella', city: 'Nacional' }
        );
        falabellaTotal += count;
        console.log(`  [Falabella] "${item.term}": ${fItems.length} items (${count} guardados)`);
      }
    } catch (e) {
      console.warn(`  [Falabella] Error en "${item.term}": ${(e as Error).message}`);
    }

    // 2. Éxito
    try {
      const exitoItems = await exitoAdapter.fetchListing('', { term: item.term, city: 'Cali' });
      if (exitoItems.length > 0) {
        const count = await upsertProductsBatch(
          exitoItems.map((p) => ({
            ...p,
            category: detectCategory(p.name, item.subcategory, item.term),
            subcategory: item.subcategory,
          })),
          { store: 'exito', city: 'Cali' }
        );
        exitoTotal += count;
        console.log(`  [Éxito] "${item.term}": ${exitoItems.length} items (${count} guardados)`);
      }
    } catch (e) {
      console.warn(`  [Éxito] Error en "${item.term}": ${(e as Error).message}`);
    }

    // 3. Alkosto
    try {
      const alkostoItems = await alkostoAdapter.fetchListing('', { term: item.term });
      if (alkostoItems.length > 0) {
        const count = await upsertProductsBatch(
          alkostoItems.map((p) => ({
            ...p,
            category: detectCategory(p.name, item.subcategory, item.term),
            subcategory: item.subcategory,
          })),
          { store: 'alkosto', city: 'Nacional' }
        );
        alkostoTotal += count;
        console.log(`  [Alkosto] "${item.term}": ${alkostoItems.length} items (${count} guardados)`);
      }
    } catch (e) {
      console.warn(`  [Alkosto] Error en "${item.term}": ${(e as Error).message}`);
    }

    // 3. Homecenter
    try {
      const hcUrl = homecenterAdapter.searchUrl(item.term);
      const hcItems = await homecenterAdapter.fetchListing(hcUrl);
      if (hcItems.length > 0) {
        const count = await upsertProductsBatch(
          hcItems.map((p) => ({
            ...p,
            category: detectCategory(p.name, item.subcategory, item.term),
            subcategory: item.subcategory,
          })),
          { store: 'homecenter', city: 'Nacional' }
        );
        homecenterTotal += count;
        console.log(`  [Homecenter] "${item.term}": ${hcItems.length} items (${count} guardados)`);
      }
    } catch (e) {
      console.warn(`  [Homecenter] Error en "${item.term}": ${(e as Error).message}`);
    }
  }

  return { falabella: falabellaTotal, exito: exitoTotal, alkosto: alkostoTotal, homecenter: homecenterTotal };
}

async function main() {
  const start = Date.now();
  console.log('===============================================================');
  console.log(`=== RECOLECCIÓN EN VIVO DE HOY: ${new Date().toISOString()} ===`);
  console.log('===============================================================');

  const [initialProducts, initialHistory] = await Promise.all([getProductCount(), getPriceHistoryCount()]);
  console.log(`Estado Inicial -> Productos: ${initialProducts} | Historial de Precios: ${initialHistory}`);

  const ikeaCount = await collectIkeaToday();
  const discCount = await collectDiscountStoresToday();
  const multiStoreCounts = await collectMultiStoresToday();

  console.log('\n[4/5] Emparejando productos idénticos/similares entre tiendas...');
  try {
    await runMatcher(true);
    console.log('  -> Matcher finalizado con éxito.');
  } catch (e) {
    console.warn('  -> Error en matcher:', (e as Error).message);
  }

  const [finalProducts, finalHistory] = await Promise.all([getProductCount(), getPriceHistoryCount()]);

  console.log('\n===============================================================');
  console.log('=== RESUMEN DE LA RECOLECCIÓN DE HOY ===');
  console.log(`  - Falabella                : ${multiStoreCounts.falabella} registros actualizados`);
  console.log(`  - IKEA Cali                : ${ikeaCount} registros actualizados`);
  console.log(`  - Tiendas D1 & Ara         : ${discCount} registros actualizados`);
  console.log(`  - Éxito                    : ${multiStoreCounts.exito} registros actualizados`);
  console.log(`  - Alkosto                  : ${multiStoreCounts.alkosto} registros actualizados`);
  console.log(`  - Homecenter               : ${multiStoreCounts.homecenter} registros actualizados`);
  console.log('---------------------------------------------------------------');
  console.log(`  - Total Productos en DB    : ${finalProducts} (+${finalProducts - initialProducts} nuevos)`);
  console.log(`  - Total Historial Precios  : ${finalHistory} (+${finalHistory - initialHistory} nuevos registros)`);
  console.log(`  - Tiempo total             : ${((Date.now() - start) / 1000).toFixed(1)} segundos`);
  console.log('===============================================================');

  await closePool();
}

main().catch(async (e) => {
  console.error('Error durante la recolección:', e);
  await closePool();
  process.exit(1);
});
