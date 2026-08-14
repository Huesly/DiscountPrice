import 'dotenv/config';
import { chromium, type Browser, type Page } from 'playwright';
import { CATEGORIES, getSearchTerms, MAX_PAGES, PAGE_DELAY_MS, POD_SELECTOR, USER_AGENT, FALABELLA_BASE } from './config.js';
import { parseCoPrice, cleanSeller } from './parse.js';
import { upsertProductsBatch, getProductCount, getPriceHistoryCount, closePool } from './db/repo.js';
import type { ScrapedProduct } from './db/repo.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function extractPods(page: Page): Promise<ScrapedProduct[]> {
  const pods = await page.locator(POD_SELECTOR).evaluateAll((els) =>
    els.map((el) => {
      const a = el as HTMLAnchorElement;
      const dataKey = a.getAttribute('data-key') ?? '';
      const brand = (a.querySelector('.pod-title') as HTMLElement | null)?.innerText.trim() ?? null;
      const name =
        (a.querySelector('.pod-subTitle') as HTMLElement | null)?.innerText.trim() ??
        a.getAttribute('aria-label') ??
        null;
      const sellerRaw = (a.querySelector('.pod-sellerText') as HTMLElement | null)?.innerText ?? null;
      const image = (a.querySelector('img') as HTMLImageElement | null)?.src ?? null;
      const liPrices = Array.from(a.querySelectorAll('li[class*="prices-"]'));
      let currentPrice: string | null = null;
      let normalPrice: string | null = null;
      for (const li of liPrices) {
        currentPrice =
          currentPrice ??
          li.getAttribute('data-event-price') ??
          li.getAttribute('data-internet-price') ??
          li.getAttribute('data-cmr-price');
        normalPrice = normalPrice ?? li.getAttribute('data-normal-price');
      }
      return {
        dataKey,
        name,
        brand,
        sellerRaw,
        image,
        eventPrice: currentPrice,
        normalPrice,
        href: a.href,
      };
    })
  );

  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();
  for (const p of pods) {
    if (!p.dataKey || seen.has(p.dataKey)) continue;
    seen.add(p.dataKey);
    const url = p.href.startsWith('http') ? p.href.split(/[?#]/)[0] : FALABELLA_BASE + p.href.split(/[?#]/)[0];
    const price = parseCoPrice(p.eventPrice);
    const original = p.normalPrice !== p.eventPrice ? parseCoPrice(p.normalPrice) : null;
    out.push({
      sku: p.dataKey,
      name: p.name ?? `Producto ${p.dataKey}`,
      brand: p.brand,
      category: 'Hogar',
      subcategory: null,
      url,
      image_url: p.image,
      seller: cleanSeller(p.sellerRaw),
      price,
      original_price: original,
      stock: price !== null,
    });
  }
  return out;
}

async function extractFromNextData(page: Page): Promise<ScrapedProduct[]> {
  const rawResults = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null;
    try {
      const json = JSON.parse(el.textContent || '');
      return json?.props?.pageProps?.results ?? null;
    } catch {
      return null;
    }
  });
  if (!Array.isArray(rawResults)) return [];

  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();
  for (const r of rawResults) {
    const sku = String(r.productId ?? '');
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);

    const name = r.displayName ?? null;
    const brand = r.brand ?? null;
    const seller = r.sellerName ?? null;
    const baseUrl = r.url ?? '';
    const skuId = String(r.skuId ?? '');
    const url = skuId && !baseUrl.endsWith(skuId) ? `${baseUrl}/${skuId}` : baseUrl;
    const mediaUrls = Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
    const image = mediaUrls[0] ?? null;

    let price: number | null = null;
    let original: number | null = null;
    if (Array.isArray(r.prices)) {
      for (const p of r.prices) {
        const raw = Array.isArray(p.price) ? p.price[0] : p.price;
        const val = parseCoPrice(raw);
        if (val === null) continue;
        if (p.crossed === true) {
          original = val;
        } else if (['internetPrice', 'eventPrice', 'cmrPrice'].includes(p.type)) {
          if (price === null) price = val;
        } else if (price === null) {
          price = val;
        }
      }
    }
    if (price === null && original !== null) {
      price = original;
      original = null;
    }

    out.push({
      sku,
      name: name ?? `Producto ${sku}`,
      brand,
      category: 'Hogar',
      subcategory: null,
      url,
      image_url: image,
      seller: cleanSeller(seller),
      price,
      original_price: original,
      stock: price !== null,
    });
  }
  return out;
}

async function collectListing(
  browser: Browser,
  baseUrl: string,
  category: string,
  subcategory: string
): Promise<number> {
  const ctx = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  const sep = baseUrl.includes('?') ? '&' : '?';
  let total = 0;
  const pageSeen = new Set<string>();
  try {
    let finished = false;
    for (let pageNo = 1; pageNo <= MAX_PAGES && !finished; pageNo++) {
      const target = pageNo === 1 ? baseUrl : `${baseUrl}${sep}page=${pageNo}`;
      try {
        await page.goto(target, { waitUntil: 'domcontentloaded' });
      } catch (err) {
        console.error(`  [guardar] ERROR navegando a página ${pageNo}:`, (err as Error).message);
        await sleep(5000);
        continue;
      }

      try {
        await page.waitForSelector(POD_SELECTOR, { timeout: 20000 });
      } catch {
        console.warn(`  [pág ${pageNo}] sin pods (posible bloqueo) -> reintento con backoff.`);
        await sleep(15000);
        try {
          await page.waitForSelector(POD_SELECTOR, { timeout: 20000 });
        } catch {
          console.warn(`  [pág ${pageNo}] sin pods tras reintento -> detengo.`);
          finished = true;
          break;
        }
      }

      let products = await extractFromNextData(page);
      if (products.length === 0) {
        console.warn(`  [pág ${pageNo}] JSON sin resultados -> fallback DOM con scroll`);
        await page.evaluate(async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y <= h; y += 800) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 80));
          }
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(1000);
        products = await extractPods(page);
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
        newProducts.map((p) => ({ ...p, category, subcategory }))
      );
      total += written;
      console.log(
        `  [pág ${pageNo}] ${products.length} pods (${newProducts.length} nuevos, ${written} escritos, acumulado: ${total})`
      );

      await sleep(PAGE_DELAY_MS + Math.floor(Math.random() * 1400));
    }
  } finally {
    await ctx.close();
  }
  return total;
}

export async function collectTerm(term: string, subcategory = 'Búsqueda'): Promise<number> {
  const url = `${FALABELLA_BASE}/falabella-co/search/?Ntt=${encodeURIComponent(term)}`;
  const browser: Browser = await chromium.launch({ headless: true });
  try {
    return await collectListing(browser, url, 'Hogar', subcategory);
  } finally {
    await browser.close();
  }
}

async function collectSearch(browser: Browser, term: string, subcategory: string): Promise<number> {
  const url = `${FALABELLA_BASE}/falabella-co/search/?Ntt=${encodeURIComponent(term)}`;
  console.log(`-- Búsqueda "${term}": ${url}`);
  const n = await collectListing(browser, url, 'Hogar', subcategory);
  console.log(`   OK: ${n} productos en esta corrida\n`);
  return n;
}

function parseGroupArg(): number | undefined {
  const m = process.argv.find((a) => a.startsWith('--group='));
  if (m) return Number(m.split('=')[1]);
  return undefined;
}

async function main() {
  const start = Date.now();
  const group = parseGroupArg();
  const terms = getSearchTerms(group);

  const mode = group
    ? `Grupo ${group}: ${terms.length} términos`
    : `Categorías: ${CATEGORIES.length} | Términos: ${terms.length}`;
  console.log(`\n=== COLLECTOR FALABELLA ===`);
  console.log(`${mode} | Máx páginas: ${MAX_PAGES}\n`);

  const browser: Browser = await chromium.launch({ headless: true });
  let total = 0;
  try {
    for (const s of terms) {
      total += await collectSearch(browser, s.term, s.subcategory);
    }
    for (const cat of CATEGORIES) {
      console.log(`-- Categoría ${cat.name} / ${cat.subcategory}: ${cat.url}`);
      const n = await collectListing(browser, cat.url, cat.name, cat.subcategory);
      total += n;
      console.log(`   OK: ${n} productos en esta corrida\n`);
    }
  } finally {
    await browser.close();
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
