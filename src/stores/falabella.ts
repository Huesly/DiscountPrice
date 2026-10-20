import type { Page } from 'playwright';
import { FALABELLA_BASE, POD_SELECTOR } from '../config.js';
import { parseCoPrice, cleanSeller } from '../parse.js';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const falabellaAdapter: StoreAdapter = {
  code: 'falabella',
  name: 'Falabella',
  pageDelayMs: 600,
  termDelayMs: 1000,

  searchUrl(term: string): string {
    return `${FALABELLA_BASE}/falabella-co/search/?Ntt=${encodeURIComponent(term)}`;
  },

  async fetchListing(targetUrl: string, opts?: { page?: number }): Promise<ScrapedProduct[]> {
    const pageNo = opts?.page ?? 1;
    const sep = targetUrl.includes('?') ? '&' : '?';
    const url = pageNo === 1 ? targetUrl : `${targetUrl}${sep}page=${pageNo}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        },
      });
      if (!res.ok) return [];
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) return [];
      const json = JSON.parse(match[1]);
      const rawResults = json?.props?.pageProps?.results ?? null;
      return parseFalabellaResults(rawResults);
    } catch {
      return [];
    }
  },

  async waitForListing(page: Page): Promise<void> {
    await page.waitForSelector(POD_SELECTOR, { timeout: 20000 }).catch(async () => {
      throw new Error('Sin pods en Falabella');
    });
  },

  async extractListing(page: Page): Promise<ScrapedProduct[]> {
    let products = await extractFromNextData(page);
    if (products.length === 0) {
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 800) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 80));
        }
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 1000));
      products = await extractPods(page);
    }
    return products;
  },
};

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
  return parseFalabellaResults(rawResults);
}

export function parseFalabellaResults(rawResults: any): ScrapedProduct[] {
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
