import type { Page } from 'playwright';
import { parseCoPrice } from '../parse.js';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const HOMECENTER_BASE = 'https://www.homecenter.com.co';

export const homecenterAdapter: StoreAdapter = {
  code: 'homecenter',
  name: 'Homecenter',
  pageDelayMs: 600,
  termDelayMs: 1000,

  searchUrl(term: string): string {
    return `${HOMECENTER_BASE}/homecenter-co/search?Ntt=${encodeURIComponent(term)}`;
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
      const rawResults = json?.props?.pageProps?.searchProps?.searchData?.results ?? null;
      return parseHomecenterResults(rawResults);
    } catch {
      return [];
    }
  },

  async waitForListing(page: Page): Promise<void> {
    await page.waitForSelector('div[data-key]', { timeout: 20000 }).catch(async () => {
      throw new Error('Sin productos en Homecenter');
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
      products = await extractFromDom(page);
    }
    return products;
  },
};

async function extractFromNextData(page: Page): Promise<ScrapedProduct[]> {
  const rawResults = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null;
    try {
      const json = JSON.parse(el.textContent || '');
      return json?.props?.pageProps?.searchProps?.searchData?.results ?? null;
    } catch {
      return null;
    }
  });
  return parseHomecenterResults(rawResults);
}

export function parseHomecenterResults(rawResults: any): ScrapedProduct[] {
  if (!Array.isArray(rawResults)) return [];

  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();
  for (const r of rawResults) {
    const sku = String(r.productId ?? r.skuId ?? '');
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);

    const mediaUrls = Array.isArray(r.mediaUrls) ? r.mediaUrls : [];
    const image = mediaUrls.find((u: unknown) => typeof u === 'string' && !/\/w=\d+/.test(u)) ?? mediaUrls[0] ?? null;

    let price: number | null = null;
    let original: number | null = null;
    if (Array.isArray(r.prices)) {
      for (const p of r.prices) {
        const type = String(p.type ?? '');
        const val = typeof p.priceWithoutFormatting === 'number' ? p.priceWithoutFormatting : parseCoPrice(p.price);
        if (val === null || val === undefined) continue;
        if (type === 'NORMAL') {
          original = val;
        } else if (type === 'INTERNET' && price === null) {
          price = val;
        } else if (price === null) {
          price = val;
        }
      }
    }
    if (price === null && original !== null) {
      price = original;
      original = null;
    }
    if (price !== null && original !== null && original < price) {
      const t = price;
      price = original;
      original = t;
    }

    out.push({
      sku,
      name: (r.displayName ?? `Producto ${sku}`).replace(/\s+/g, ' ').trim(),
      brand: r.brand ?? null,
      category: 'Hogar',
      subcategory: null,
      url: `${HOMECENTER_BASE}/homecenter-co/product/${sku}/`,
      image_url: image,
      seller: null,
      price,
      original_price: original,
      stock: price !== null,
    });
  }
  return out;
}

async function extractFromDom(page: Page): Promise<ScrapedProduct[]> {
  return page.$$eval('div[data-key]', (els) => {
    const out: Record<string, string | null>[] = [];
    const seen = new Set<string>();
    for (const el of els) {
      const sku = el.getAttribute('data-key');
      if (!sku || seen.has(sku)) continue;
      seen.add(sku);

      const link = el.querySelector('a[href*="/product/"]') as HTMLAnchorElement | null;
      const title = el.querySelector('h2.product-title') as HTMLElement | null;
      const brand = el.querySelector('.product-brand') as HTMLElement | null;
      const priceEl = el.querySelector('.main .parsedPrice') as HTMLElement | null;
      const oldPriceEl = el.querySelector('.sub .parsedPrice.label') as HTMLElement | null;
      const img = el.querySelector('.product-image img') as HTMLImageElement | null;

      out.push({
        sku,
        name: title ? title.textContent?.trim() ?? null : null,
        brand: brand ? brand.textContent?.trim() ?? null : null,
        price: priceEl ? priceEl.textContent?.trim() ?? null : null,
        original: oldPriceEl ? oldPriceEl.textContent?.trim() ?? null : null,
        image: img ? img.src ?? null : null,
        url: link ? link.href ?? null : null,
      });
    }
    return out;
  }).then((rows) =>
    rows
      .map((r) => ({
        sku: r.sku as string,
        name: (r.name ?? `Producto ${r.sku}`).replace(/\s+/g, ' ').trim(),
        brand: r.brand,
        category: 'Hogar',
        subcategory: null,
        url: (r.url ?? `${HOMECENTER_BASE}/homecenter-co/product/${r.sku}/`).split(/[?#]/)[0],
        image_url: r.image && r.image.startsWith('http') ? r.image : null,
        seller: null,
        price: parseCoPrice(r.price),
        original_price: parseCoPrice(r.original),
        stock: parseCoPrice(r.price) !== null,
      }))
  );
}
