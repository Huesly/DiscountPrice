import type { Page } from 'playwright';
import { parseCoPrice } from '../parse.js';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const ALKOSTO_BASE = 'https://www.alkosto.com';

const ALGOLIA_APP_ID = 'QX5IPS1B1Q';
const ALGOLIA_API_KEY =
  'ODNiNzFhOTg5MWEyNWYxZGIyMmMyODFjYjNkMWU3NjVhNjUzYzgzZWUwMjkwODI3NmM4MDliNTY4OTEzODc5NCZmaWx0ZXJzPWF2YWlsYWJsZUJ1eUJ1dE5vdFZpc2libGVfYm9vbGVhbiUzQWZhbHNl';
const ALGOLIA_INDEX = 'alkostoIndexAlgoliaPRD';

export const alkostoAdapter: StoreAdapter = {
  code: 'alkosto',
  name: 'Alkosto',
  pageDelayMs: 400,
  termDelayMs: 800,

  searchUrl(term: string): string {
    return `${ALKOSTO_BASE}/search?text=${encodeURIComponent(term)}`;
  },

  async fetchListing(
    targetUrl: string,
    opts?: { page?: number; term?: string }
  ): Promise<ScrapedProduct[]> {
    let term = opts?.term;
    if (!term) {
      try {
        const u = new URL(targetUrl);
        term = u.searchParams.get('text') ?? u.searchParams.get('q') ?? '';
      } catch {
        term = '';
      }
    }
    if (!term) return [];

    const pageNo = opts?.page ?? 1;
    const algoliaPage = Math.max(0, pageNo - 1);

    const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-algolia-application-id': ALGOLIA_APP_ID,
          'x-algolia-api-key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: term,
          hitsPerPage: 20,
          page: algoliaPage,
        }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      return parseAlgoliaHits(data?.hits ?? []);
    } catch {
      return [];
    }
  },

  async waitForListing(page: Page): Promise<void> {
    await page.waitForSelector('.product__item, .ais-Hits-item', { timeout: 15000 }).catch(async () => {
      throw new Error('Sin productos en Alkosto');
    });
  },

  async extractListing(page: Page): Promise<ScrapedProduct[]> {
    return page.$$eval('.product__item, .ais-Hits-item', (els) => {
      const out: Record<string, string | null>[] = [];
      const seen = new Set<string>();
      for (const el of els) {
        const link = el.querySelector('a[href*="/p/"]') as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href || '';
        const m = href.match(/\/p\/([0-9a-zA-Z_-]+)/);
        const sku = m ? m[1] : null;
        if (!sku || seen.has(sku)) continue;
        seen.add(sku);

        const nameEl = el.querySelector('.product__item__information__name, .product__name, h3, h2');
        const priceEl = el.querySelector('.price, .product__price--discounts__price, .price-main');
        const oldPriceEl = el.querySelector('.price-original, .product__price--discounts__old');
        const imgEl = el.querySelector('img');

        out.push({
          sku,
          name: nameEl?.textContent?.trim() ?? null,
          brand: null,
          price: priceEl?.textContent?.trim() ?? null,
          original: oldPriceEl?.textContent?.trim() ?? null,
          image: imgEl?.src ?? null,
          url: href,
          seller: 'Alkosto',
        });
      }
      return out;
    }).then((rows) =>
      rows.map((r) => ({
        sku: r.sku as string,
        name: (r.name ?? `Producto ${r.sku}`).replace(/\s+/g, ' ').trim(),
        brand: null,
        category: 'Hogar',
        subcategory: null,
        url: (r.url ?? '').split(/[?#]/)[0],
        image_url: r.image,
        seller: 'Alkosto',
        price: parseCoPrice(r.price),
        original_price: parseCoPrice(r.original),
        stock: parseCoPrice(r.price) !== null,
      }))
    );
  },
};

export function parseAlgoliaHits(hits: any[]): ScrapedProduct[] {
  if (!Array.isArray(hits)) return [];
  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();

  for (const h of hits) {
    const sku = String(h.code_string || h.objectID || '');
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);

    const name = String(h.name_text_es || h.name || `Producto ${sku}`).replace(/\s+/g, ' ').trim();
    const brand = Array.isArray(h.brand_string_mv) ? h.brand_string_mv[0] : h.marca_text || null;
    const price = typeof h.pricevalue_cop_double === 'number' ? h.pricevalue_cop_double : null;

    let original: number | null = null;
    if (typeof h.lowestprice_double === 'number' && h.lowestprice_double > (price ?? 0)) {
      original = h.lowestprice_double;
    } else if (typeof h.baseprice_cop_string === 'string') {
      const parsedBase = parseCoPrice(h.baseprice_cop_string);
      if (parsedBase && price && parsedBase > price) {
        original = parsedBase;
      }
    }

    const image =
      h['img-820wx820h_string'] ||
      h['img-1400wx1400h_string'] ||
      h['img-750wx750h_string'] ||
      h['img-310wx310h_string'] ||
      null;

    const url = h.url_es_string
      ? `${ALKOSTO_BASE}${h.url_es_string}`
      : `${ALKOSTO_BASE}/p/${sku}`;

    const stock = typeof h.instockflag_boolean === 'boolean' ? h.instockflag_boolean : price !== null;

    out.push({
      sku,
      name,
      brand,
      category: 'Hogar',
      subcategory: null,
      url,
      image_url: image,
      seller: 'Alkosto',
      price,
      original_price: original,
      stock,
    });
  }

  return out;
}
