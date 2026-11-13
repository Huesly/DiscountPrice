import 'dotenv/config';
import { chromium, type Browser, type Page } from 'playwright';
import { CATEGORIES, getSearchTerms, MAX_PAGES, PAGE_DELAY_MS, USER_AGENT } from './config.js';
import { falabellaAdapter } from './stores/falabella.js';
import { exitoAdapter } from './stores/exito.js';
import { homecenterAdapter } from './stores/homecenter.js';
import { alkostoAdapter } from './stores/alkosto.js';
import { d1Adapter, getAllD1Products } from './stores/d1.js';
import { araAdapter, getAllAraProducts } from './stores/ara.js';
import { ikeaAdapter } from './stores/ikea.js';
import type { StoreAdapter } from './stores/types.js';
import { upsertProductsBatch, getProductCount, getPriceHistoryCount, closePool } from './db/repo.js';
import type { ScrapedProduct } from './db/repo.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ADAPTERS: Record<string, StoreAdapter> = {
  falabella: falabellaAdapter,
  exito: exitoAdapter,
  homecenter: homecenterAdapter,
  alkosto: alkostoAdapter,
  d1: d1Adapter,
  ara: araAdapter,
  ikea: ikeaAdapter,
};

export function detectCategory(name: string, subcategory?: string | null, term?: string | null): string {
  const text = `${name} ${subcategory ?? ''} ${term ?? ''}`.toLowerCase();

  // 1. Excluir electrodomésticos y ferretería que usen palabras de comida
  const isApplianceOrHardware = /\b(cafetera|olla|arrocera|extractor|maquina|máquina|molino|espumador|lavadora|secadora|torre de lavado|transformador|motor|vehicular|lubricante|crema corporal|serum|bloqueador|dispensador)\b/i.test(text);

  // 2. Comidas y Supermercado
  if (
    !isApplianceOrHardware &&
    /\b(arroz|leche|aceite|cafe|café|atun|atún|huevos|huevo|pollo|carne|pasta|pastas|espagueti|azucar|azúcar|queso|yogurt|yogur|pan|panaderia|galletas|chocolate|chocolatina|cereales|cereal|snack|snacks|gaseosa|cerveza|bebida|bebidas|alimento|alimentos|comida|comidas|mercado|despensa|grano|granos|frijol|frijoles|lenteja|lentejas|sardina|sardinas|atunes|jamon|jamón|salchicha|embutidos|fruta|frutas|verdura|verduras|detergente|jabon|jabón|blanqueador|desinfectante|suavizante|aseo)\b/i.test(text)
  ) {
    return 'Comidas y Supermercado';
  }

  // 3. Tecnología y Celulares
  if (
    /\b(celular|celulares|smartphone|samsung|iphone|apple|macbook|ipad|imac|airpods|xiaomi|motorola|huawei|oppo|realme|infinix|computador|laptop|portatil|portátil|tablet|tv|televisor|pantalla|monitor|audifonos|audífonos|reloj|smartwatch|ups|regulador|bateria|teclado|mouse|impresora)\b/i.test(text)
  ) {
    return 'Tecnología y Celulares';
  }

  // 4. Electrohogar y Cocina
  if (
    /\b(licuadora|microondas|cafetera|lavadora|secadora|nevera|refrigerador|estufa|horno|airfryer|freidora|aspiradora|platos|ollas|olla|sarten|sartén|vajilla|cacerola|cubiertos|tazas|vasos|lavadero|lavaplatos|maquina afeitar|afeitadora|plancha|batidora|tostadora|procesador|arrocera|dispensador)\b/i.test(text)
  ) {
    return 'Electrohogar y Cocina';
  }

  // 5. Muebles y Hogar
  if (
    /\b(mesa|mesas|silla|sillas|comedor|escritorio|colchon|colchón|closet|armario|tapete|lampara|lámpara|mesita|mueble|sofa|sofá|cama|tocador|comoda|cómoda|estante|repisa|persiana|persianas|plegable|plegables|jardin|jardín|almohada|sabana|sábanas|edredon|edredón|cortina|cortinas)\b/i.test(text)
  ) {
    return 'Muebles y Hogar';
  }

  return 'Hogar y Variados';
}

export const FOOD_SEARCH_TERMS = [
  'arroz',
  'aceite vegetal',
  'leche entera',
  'cafe molido',
  'atun lomitos',
  'huevos',
  'pollo',
  'pasta espagueti',
  'azucar',
  'queso',
  'yogurt',
  'pan tajado',
  'galletas',
  'chocolate',
  'cereales',
  'gaseosa',
  'detergente',
];

async function collectListingFast(
  adapter: StoreAdapter,
  baseUrl: string,
  category: string,
  subcategory: string,
  city: string | null,
  term?: string
): Promise<{ total: number; success: boolean }> {
  if (!adapter.fetchListing) return { total: 0, success: false };

  let total = 0;
  const pageSeen = new Set<string>();
  let finished = false;

  for (let pageNo = 1; pageNo <= MAX_PAGES && !finished; pageNo++) {
    try {
      const products = await adapter.fetchListing(baseUrl, { page: pageNo, city, term });
      if (!products || products.length === 0) {
        if (pageNo === 1) return { total, success: false };
        finished = true;
        break;
      }

      const newProducts = products.filter((p) => !pageSeen.has(p.sku));
      for (const p of products) pageSeen.add(p.sku);

      if (newProducts.length === 0) {
        console.warn(`  [fast pág ${pageNo}] ${products.length} pods sin SKUs nuevos -> detengo.`);
        finished = true;
        break;
      }

      const written = await upsertProductsBatch(
        newProducts.map((p) => ({
          ...p,
          category: category && category !== 'Hogar' ? category : detectCategory(p.name, subcategory, term),
          subcategory: subcategory ?? term ?? null,
        })),
        { store: adapter.code, city }
      );
      total += written;
      console.log(
        `  [fast pág ${pageNo}] ${products.length} items (${newProducts.length} nuevos, ${written} escritos, acumulado: ${total})`
      );

      await sleep((adapter.pageDelayMs ?? 400) + Math.floor(Math.random() * 200));
    } catch (err) {
      console.warn(`  [fast pág ${pageNo}] error: ${(err as Error).message}`);
      if (pageNo === 1) return { total, success: false };
      finished = true;
      break;
    }
  }

  return { total, success: true };
}

async function collectListingPlaywright(
  browser: Browser | null,
  adapter: StoreAdapter,
  baseUrl: string,
  category: string,
  subcategory: string,
  city: string | null
): Promise<number> {
  const ownsBrowser = !browser;
  const b = browser ?? (await chromium.launch({ headless: true }));
  const ctx = await b.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  // Bloquear recursos innecesarios (imágenes, fuentes, estilos, telemetría) para máxima velocidad
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    const url = route.request().url();
    if (
      ['image', 'media', 'font', 'stylesheet'].includes(resourceType) ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('datadog')
    ) {
      return route.abort();
    }
    return route.continue();
  });

  const sep = baseUrl.includes('?') ? '&' : '?';
  let total = 0;
  const pageSeen = new Set<string>();

  try {
    if (adapter.setRegion && city) {
      await adapter.setRegion(page, city);
    }

    let finished = false;
    for (let pageNo = 1; pageNo <= MAX_PAGES && !finished; pageNo++) {
      const target = pageNo === 1 ? baseUrl : `${baseUrl}${sep}page=${pageNo}`;
      try {
        await page.goto(target, { waitUntil: 'domcontentloaded' });
      } catch (err) {
        console.error(`  [guardar] ERROR navegando a página ${pageNo}:`, (err as Error).message);
        await sleep(3000);
        continue;
      }

      try {
        await adapter.waitForListing(page);
      } catch {
        console.warn(`  [pág ${pageNo}] sin pods -> reintento con backoff.`);
        await sleep(5000);
        try {
          await adapter.waitForListing(page);
        } catch {
          console.warn(`  [pág ${pageNo}] sin pods tras reintento -> detengo.`);
          finished = true;
          break;
        }
      }

      let products = await adapter.extractListing(page);
      if (products.length === 0) {
        await page.evaluate(async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y <= h; y += 800) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 80));
          }
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(500);
        products = await adapter.extractListing(page);
      }
      if (products.length === 0) {
        finished = true;
        break;
      }

      const newProducts = products.filter((p) => !pageSeen.has(p.sku));
      for (const p of products) pageSeen.add(p.sku);

      if (newProducts.length === 0) {
        console.warn(`  [pág ${pageNo}] ${products.length} pods pero sin SKUs nuevos -> detengo.`);
        finished = true;
        break;
      }

      const written = await upsertProductsBatch(
        newProducts.map((p) => ({
          ...p,
          category: category && category !== 'Hogar' ? category : detectCategory(p.name, subcategory, term),
          subcategory: subcategory ?? term ?? null,
        })),
        { store: adapter.code, city }
      );
      total += written;
      console.log(
        `  [pág ${pageNo}] ${products.length} pods (${newProducts.length} nuevos, ${written} escritos, acumulado: ${total})`
      );

      await sleep((adapter.pageDelayMs ?? PAGE_DELAY_MS) + Math.floor(Math.random() * 600));
    }
  } finally {
    await ctx.close();
    if (ownsBrowser) {
      await b.close();
    }
  }
  return total;
}

async function collectListing(
  browser: Browser | null,
  adapter: StoreAdapter,
  baseUrl: string,
  category: string,
  subcategory: string,
  city: string | null,
  term?: string
): Promise<number> {
  // 1. Intentar primero con el método rápido HTTP / API (Fast First)
  if (adapter.fetchListing) {
    const fastResult = await collectListingFast(adapter, baseUrl, category, subcategory, city, term);
    if (fastResult.success) {
      return fastResult.total;
    }
    console.warn(`  [fast] Sin resultados directos. Activando fallback a Playwright...`);
  }

  // 2. Fallback a Playwright optimizado
  return collectListingPlaywright(browser, adapter, baseUrl, category, subcategory, city);
}

export async function collectTerm(
  term: string,
  subcategory = 'Búsqueda',
  store = 'all',
  city: string | null = null,
  category?: string
): Promise<number> {
  const cat = category ?? detectCategory(term, subcategory);
  const storesToRun = store === 'all' ? Object.keys(ADAPTERS) : [store];
  const results = await Promise.all(
    storesToRun.map(async (st) => {
      const adapter = ADAPTERS[st];
      if (!adapter) return 0;
      const url = adapter.searchUrl(term);
      return collectListing(null, adapter, url, cat, subcategory, city, term);
    })
  );
  return results.reduce((acc, n) => acc + n, 0);
}

export async function collectFoodDeals(): Promise<{ totalCollected: number; termsProcessed: number }> {
  let total = 0;
  // 1. Insertar catálogo completo de D1 y Ara
  try {
    total += await upsertProductsBatch(getAllD1Products(), { store: 'd1', city: null });
    total += await upsertProductsBatch(getAllAraProducts(), { store: 'ara', city: null });
  } catch (e) {
    console.warn('Error insertando D1/Ara:', (e as Error).message);
  }
  // 2. Colectar en vivo desde Éxito
  for (const term of FOOD_SEARCH_TERMS) {
    try {
      const n = await collectTerm(term, 'Supermercado', 'exito', null, 'Comidas y Supermercado');
      total += n;
    } catch (e) {
      console.warn(`Error colectando alimento "${term}":`, (e as Error).message);
    }
  }
  return { totalCollected: total, termsProcessed: FOOD_SEARCH_TERMS.length };
}

function parseArg(prefix: string): string | undefined {
  const m = process.argv.find((a) => a.startsWith(prefix));
  if (m) return m.split('=')[1];
  return undefined;
}

function parseGroupArg(): number | undefined {
  const v = parseArg('--group=');
  return v ? Number(v) : undefined;
}

async function main() {
  const start = Date.now();
  const group = parseGroupArg();
  const store = parseArg('--store=') ?? 'falabella';
  const city = parseArg('--city=') ?? null;
  const adapter = ADAPTERS[store];
  if (!adapter) {
    console.error(`Tienda desconocida: ${store}. Disponibles: ${Object.keys(ADAPTERS).join(', ')}`);
    process.exit(1);
  }

  const terms = getSearchTerms(group);

  const mode = group
    ? `Grupo ${group}: ${terms.length} términos`
    : `Categorías: ${CATEGORIES.length} | Términos: ${terms.length}`;
  console.log(`\n=== COLLECTOR ${adapter.name.toUpperCase()} (FAST HYBRID) ===`);
  console.log(`${mode} | Máx páginas: ${MAX_PAGES} | Ciudad: ${city ?? 'nacional'}\n`);

  let browser: Browser | null = null;
  let total = 0;
  const failed: { term: string; subcategory: string }[] = [];
  try {
    for (const s of terms) {
      const url = adapter.searchUrl(s.term);
      console.log(`-- Búsqueda "${s.term}": ${url}`);
      const n = await collectListing(browser, adapter, url, 'Hogar', s.subcategory, city, s.term);
      total += n;
      console.log(`   OK: ${n} productos en esta corrida\n`);
      if (n === 0) failed.push({ term: s.term, subcategory: s.subcategory });
      const termDelay = adapter.termDelayMs ?? 500;
      if (termDelay > 0 && s !== terms[terms.length - 1]) {
        await sleep(termDelay);
      }
    }
    if (store === 'falabella') {
      for (const cat of CATEGORIES) {
        console.log(`-- Categoría ${cat.name} / ${cat.subcategory}: ${cat.url}`);
        const n = await collectListing(browser, adapter, cat.url, cat.name, cat.subcategory, city);
        total += n;
        console.log(`   OK: ${n} productos en esta corrida\n`);
        const termDelay = adapter.termDelayMs ?? 500;
        if (termDelay > 0 && cat !== CATEGORIES[CATEGORIES.length - 1]) {
          await sleep(termDelay);
        }
      }
    }

    if (failed.length > 0) {
      console.log(`\n=== REINTENTO DE ${failed.length} TÉRMINOS FALLIDOS ===`);
      await sleep(5000);
      const retried: string[] = [];
      for (const f of failed) {
        const url = adapter.searchUrl(f.term);
        console.log(`-- Reintento "${f.term}": ${url}`);
        const n = await collectListing(browser, adapter, url, 'Hogar', f.subcategory, city, f.term);
        total += n;
        console.log(`   OK: ${n} productos en este reintento\n`);
        if (n > 0) retried.push(f.term);
        const termDelay = adapter.termDelayMs ?? 500;
        if (termDelay > 0 && f !== failed[failed.length - 1]) {
          await sleep(termDelay);
        }
      }
      console.log(`Reintentos recuperados: ${retried.length}/${failed.length}`);
    }
  } finally {
    if (browser) {
      await (browser as Browser).close();
    }
  }

  const [pc, ph] = await Promise.all([getProductCount(), getPriceHistoryCount()]);
  console.log('=== RESUMEN ===');
  console.log(`Productos nuevos colectados : ${total}`);
  console.log(`Productos en BD             : ${pc}`);
  console.log(`Registros price_history     : ${ph}`);
  console.log(`Tiempo total                : ${((Date.now() - start) / 1000).toFixed(1)}s`);

  await closePool();
}

if (process.argv[1]?.endsWith('collector.ts')) {
  main().catch(async (e) => {
    console.error('ERROR:', e);
    await closePool();
    process.exit(1);
  });
}
