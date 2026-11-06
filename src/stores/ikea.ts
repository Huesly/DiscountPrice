import type { Page } from 'playwright';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter, FetchListingOptions } from './types.js';
import { parseCoPrice } from '../parse.js';

export const IKEA_BASE = 'https://www.ikea.com/co/es';
export const IKEA_CDT_API = 'https://sik.search.blue.cdtapps.com/co/es/search-result-page';

export const ikeaAdapter: StoreAdapter = {
  code: 'ikea',
  name: 'IKEA',
  pageDelayMs: 400,
  termDelayMs: 800,

  searchUrl(term: string): string {
    return `${IKEA_BASE}/search/?q=${encodeURIComponent(term)}`;
  },

  async fetchListing(
    targetUrl: string,
    opts?: FetchListingOptions
  ): Promise<ScrapedProduct[]> {
    let term = opts?.term;
    if (!term) {
      try {
        const u = new URL(targetUrl);
        term = u.searchParams.get('q') ?? '';
      } catch {
        term = '';
      }
    }
    if (!term) return [];

    const pageSize = 60;
    const url = `${IKEA_CDT_API}?q=${encodeURIComponent(term)}&size=${pageSize}`;

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) return [];

      const json = await res.json();
      const rawItems = json?.searchResultPage?.products?.main?.items ?? [];
      const results: ScrapedProduct[] = [];

      for (const item of rawItems) {
        const p = item?.product;
        if (!p || !p.id) continue;

        const sku = String(p.id || p.itemNo);
        const typeName = p.typeName ? ` (${p.typeName})` : '';
        const measure = p.itemMeasureReferenceText ? ` ${p.itemMeasureReferenceText}` : '';
        const fullName = `IKEA ${p.name}${typeName}${measure}`.replace(/\s+/g, ' ').trim();

        const currentPrice =
          typeof p.salesPrice?.numeral === 'number' && p.salesPrice.numeral > 0
            ? p.salesPrice.numeral
            : parseCoPrice(p.salesPrice?.current?.wholeNumber);

        let originalPrice: number | null = null;
        if (p.salesPrice?.previous?.wholeNumber) {
          originalPrice = parseCoPrice(p.salesPrice.previous.wholeNumber);
        } else if (p.salesPrice?.discountAmount?.wholeNumber && currentPrice) {
          const discountAmt = parseCoPrice(p.salesPrice.discountAmount.wholeNumber);
          if (discountAmt && discountAmt > 0) {
            originalPrice = currentPrice + discountAmt;
          }
        }

        const productUrl = p.pipUrl || `${IKEA_BASE}/p/${p.id}/`;
        const imageUrl = p.mainImageUrl || p.allProductImage?.[0]?.url || null;

        results.push({
          sku,
          name: fullName,
          brand: 'IKEA',
          seller: 'IKEA Cali',
          url: productUrl,
          image_url: imageUrl,
          price: currentPrice,
          original_price: originalPrice,
          stock: p.onlineSellable !== false && p.homeDelivery !== 'OUT_OF_STOCK',
        });
      }

      return results;
    } catch (err) {
      console.warn(`[ikea] Error consultando API CDT para "${term}": ${(err as Error).message}`);
      return [];
    }
  },

  async waitForListing(page: Page): Promise<void> {
    await page.waitForSelector('.plp-product-list, [data-testid="search-grid"]', { timeout: 15000 }).catch(() => {
      throw new Error('Sin productos en IKEA');
    });
  },

  async extractListing(page: Page): Promise<ScrapedProduct[]> {
    return page.evaluate(() => {
      const items: ScrapedProduct[] = [];
      const cards = document.querySelectorAll('.plp-fragment-wrapper, .pip-product-compact');
      cards.forEach((card) => {
        const link = card.querySelector('a.pip-link, a[href*="/p/"]') as HTMLAnchorElement | null;
        const nameEl = card.querySelector('.pip-header-section__title--small, .pip-product-compact__name');
        const typeEl = card.querySelector('.pip-header-section__description-text, .pip-product-compact__type');
        const priceEl = card.querySelector('.pip-temp-price__sr-text, .pip-price__integer');
        if (!link || !nameEl) return;

        const name = `${nameEl.textContent?.trim() ?? ''} ${typeEl?.textContent?.trim() ?? ''}`.trim();
        const skuMatch = link.href.match(/-(\d+)\/?$/);
        const sku = skuMatch ? skuMatch[1] : link.href;
        const img = card.querySelector('img') as HTMLImageElement | null;

        items.push({
          sku,
          name: `IKEA ${name}`,
          brand: 'IKEA',
          seller: 'IKEA Cali',
          url: link.href,
          image_url: img?.src ?? null,
          price: null,
          original_price: null,
        });
      });
      return items;
    });
  },
};
