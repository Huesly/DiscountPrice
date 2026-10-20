import type { Page } from 'playwright';
import { parseCoPrice } from '../parse.js';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const EXITO_BASE = 'https://www.exito.com';

const PRICE_CURRENT_SELECTORS = ['[data-testid="store-price"]', '[class*="ProductPrice_container__price"]'];
const PRICE_ORIGINAL_SELECTOR = '[class*="price-dashed"]';

export const exitoAdapter: StoreAdapter = {
  code: 'exito',
  name: 'Éxito',
  pageDelayMs: 600,
  termDelayMs: 1000,

  searchUrl(term: string): string {
    return `${EXITO_BASE}/s/?q=${encodeURIComponent(term)}`;
  },

  async fetchListing(targetUrl: string, opts?: { page?: number; city?: string | null; term?: string }): Promise<ScrapedProduct[]> {
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

    const pageNo = opts?.page ?? 1;
    const pageSize = 20;
    const from = (pageNo - 1) * pageSize;
    const to = pageNo * pageSize - 1;
    const vtexUrl = `${EXITO_BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=${from}&_to=${to}`;

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    };

    if (opts?.city) {
      const postal = postalFor(opts.city);
      try {
        const regionId = await resolveRegionId(postal);
        if (regionId) {
          const segment = {
            campaigns: null,
            channel: '1',
            priceTables: null,
            regionId,
            utm_campaign: null,
            utm_source: null,
            utmi_campaign: null,
            currencyCode: 'COP',
            currencySymbol: '$',
            countryCode: 'COL',
            cultureInfo: 'es-CO',
            channelPrivacy: 'public',
          };
          headers['Cookie'] = `vtex_segment=${Buffer.from(JSON.stringify(segment)).toString('base64')}`;
        }
      } catch {
        // Fallback without regional cookie
      }
    }

    try {
      const res = await fetch(vtexUrl, { headers });
      if (!res.ok && res.status !== 206) return [];
      const json = await res.json();
      return parseVtexProducts(json);
    } catch {
      return [];
    }
  },

  async setRegion(page: Page, city: string): Promise<void> {
    const postal = postalFor(city);
    try {
      const regionId = await resolveRegionId(postal);
      if (!regionId) return;
      const segment = {
        campaigns: null,
        channel: '1',
        priceTables: null,
        regionId,
        utm_campaign: null,
        utm_source: null,
        utmi_campaign: null,
        currencyCode: 'COP',
        currencySymbol: '$',
        countryCode: 'COL',
        cultureInfo: 'es-CO',
        channelPrivacy: 'public',
      };
      await page.context().addCookies([
        {
          name: 'vtex_segment',
          value: Buffer.from(JSON.stringify(segment)).toString('base64'),
          domain: '.exito.com',
          path: '/',
        },
      ]);
    } catch {
      // Si falla la regionalización, seguimos sin ella (precios nacionales).
    }
  },

  async waitForListing(page: Page): Promise<void> {
    const cookieBtn = page.locator('[data-fs-cookies-modal-button]');
    if (await cookieBtn.count()) {
      await cookieBtn.first().click().catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
    }
    await page
      .waitForSelector(PRICE_CURRENT_SELECTORS.join(', '), { timeout: 25000 })
      .catch(async () => {
        throw new Error('Sin precios en Éxito');
      });
    await new Promise((r) => setTimeout(r, 800));
  },

  async extractListing(page: Page): Promise<ScrapedProduct[]> {
    return page
      .$$eval(
        'article[class*="productCard"]',
        (els, selectors: { current: string; original: string }) => {
          const out: Record<string, string | null>[] = [];
          const seen = new Set<string>();
          for (const el of els) {
            const link = el.querySelector('a[data-testid="product-link"]') as HTMLAnchorElement | null;
            if (!link) continue;
            const href = link.href || '';
            const m = href.match(/-(\d+)(?:-mp)?\/p(?:\?|$)/);
            const sku = m ? m[1] : null;
            if (!sku || seen.has(sku)) continue;
            seen.add(sku);

            const nameEl = el.querySelector('h3[class*="styles_name"]');
            const brandEl = el.querySelector('h3[class*="styles_brand"]');
            const priceEl = el.querySelector(selectors.current);
            const oldPriceEl = el.querySelector(selectors.original);
            const imgEl = el.querySelector('a[data-testid="product-link"] img');
            const sellerEl = el.querySelector('[data-fs-product-details-seller__name]');

            out.push({
              sku,
              name: nameEl ? nameEl.textContent?.trim() ?? null : null,
              brand: brandEl ? brandEl.textContent?.trim() ?? null : null,
              price: priceEl ? priceEl.textContent?.trim() ?? null : null,
              original: oldPriceEl ? oldPriceEl.textContent?.trim() ?? null : null,
              image: imgEl ? (imgEl as HTMLImageElement).src ?? null : null,
              url: href,
              seller: sellerEl ? sellerEl.parentElement?.textContent?.trim() ?? null : null,
            });
          }
          return out;
        },
        { current: PRICE_CURRENT_SELECTORS.join(','), original: PRICE_ORIGINAL_SELECTOR }
      )
      .then((rows) =>
      rows
        .map((r) => ({
          sku: r.sku as string,
          name: (r.name ?? `Producto ${r.sku}`).replace(/\s+/g, ' ').trim(),
          brand: r.brand,
          category: 'Hogar',
          subcategory: null,
          url: (r.url ?? '').split(/[?#]/)[0],
          image_url: r.image,
          seller: r.seller?.replace(/^Vendido\s+por\s*:?\s*/i, '').replace(/^:/, '').trim() || null,
          price: parseCoPrice(r.price),
          original_price: parseCoPrice(r.original),
          stock: parseCoPrice(r.price) !== null,
        }))
    );
  },
};

function postalFor(city: string): string {
  const map: Record<string, string> = { Cali: '760000', Bucaramanga: '680000', Bogotá: '110111', Medellín: '050001' };
  return map[city] ?? city;
}

async function resolveRegionId(postal: string): Promise<string | null> {
  try {
    const res = await fetch(`${EXITO_BASE}/api/checkout/pub/regions?country=COL&postalCode=${encodeURIComponent(postal)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ id?: string }>;
    return json?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function parseVtexProducts(vtexProducts: any[]): ScrapedProduct[] {
  if (!Array.isArray(vtexProducts)) return [];
  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();

  for (const p of vtexProducts) {
    const item = p.items?.[0];
    const sku = String(item?.itemId ?? p.productId ?? '');
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);

    const name = (p.productName ?? `Producto ${sku}`).replace(/\s+/g, ' ').trim();
    const brand = p.brand ?? null;
    const sellerObj = item?.sellers?.[0];
    const seller = sellerObj?.sellerName ?? null;
    const commOffer = sellerObj?.commertialOffer;

    let price: number | null = typeof commOffer?.Price === 'number' ? commOffer.Price : null;
    let original: number | null = typeof commOffer?.ListPrice === 'number' ? commOffer.ListPrice : null;
    if (price === 0) price = null;
    if (original === 0) original = null;
    if (original !== null && price !== null && original <= price) {
      original = null;
    }

    const image = item?.images?.[0]?.imageUrl ?? null;
    const url = p.link ? p.link.split(/[?#]/)[0] : `${EXITO_BASE}/${p.linkText}/p`;
    const stock = commOffer?.AvailableQuantity ? commOffer.AvailableQuantity > 0 : price !== null;

    out.push({
      sku,
      name,
      brand,
      category: 'Hogar',
      subcategory: null,
      url,
      image_url: image,
      seller,
      price,
      original_price: original,
      stock,
    });
  }
  return out;
}
