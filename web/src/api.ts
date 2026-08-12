export interface Stats {
  products: number;
  price_records: number;
  active_deals: number;
  categories: number;
}

export interface ProductRow {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  seller: string | null;
  url: string;
  image_url: string | null;
  price: number | null;
  original_price: number | null;
  captured_at: string | null;
}

export interface HistoryPoint {
  price: number;
  original_price: number | null;
  stock: boolean | null;
  captured_at: string;
}

export interface PriceStats {
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  samples: number;
}

export interface Deal {
  sku: string;
  name: string;
  url: string;
  image_url: string | null;
  brand: string | null;
  price: number;
  min_historical: number | null;
  avg_30d: number | null;
  discount_pct: number | null;
  deal_score: number | null;
  detected_at: string;
}

export type SortKey = 'default' | 'price_asc' | 'price_desc' | 'discount' | 'newest' | 'deal_score';

export interface ProductFilters {
  query?: string;
  brands?: string[];
  skus?: string[];
  minPrice?: number;
  maxPrice?: number;
  dealOnly?: boolean;
  favOnly?: boolean;
  sort?: SortKey;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'POST' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  stats: () => get<Stats>('/api/stats'),
  products: (f: ProductFilters = {}, limit = 24, offset = 0) => {
    const q = new URLSearchParams();
    if (f.query) q.set('query', f.query);
    if (f.brands && f.brands.length) q.set('brands', f.brands.join(','));
    if (f.skus && f.skus.length) q.set('skus', f.skus.join(','));
    if (f.minPrice !== undefined) q.set('minPrice', String(f.minPrice));
    if (f.maxPrice !== undefined) q.set('maxPrice', String(f.maxPrice));
    if (f.dealOnly) q.set('dealOnly', 'true');
    if (f.sort && f.sort !== 'default') q.set('sort', f.sort);
    q.set('limit', String(limit));
    q.set('offset', String(offset));
    return get<{ total: number; items: ProductRow[] }>(`/api/products?${q.toString()}`);
  },
  brands: () => get<string[]>('/api/brands'),
  product: (sku: string) => get<ProductRow>(`/api/products/${sku}`),
  history: (sku: string) => get<HistoryPoint[]>(`/api/products/${sku}/history?limit=200`),
  statsFor: (sku: string) => get<{ product: ProductRow | null; stats: PriceStats }>(`/api/products/${sku}/stats`),
  deals: () => get<Deal[]>('/api/deals?limit=12'),
  collect: (term: string) => post<{ term: string; added: number }>(`/api/collect?term=${encodeURIComponent(term)}`),
};

export function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `$${Math.round(n).toLocaleString('es-CO')}`;
}

export function discountPct(p: { price: number | null; original_price: number | null }): number | null {
  if (p.price === null || p.original_price === null || p.original_price <= 0) return null;
  return Math.round(((p.original_price - p.price) / p.original_price) * 100);
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export const SORT_LABELS: Record<SortKey, string> = {
  default: 'Más relevantes',
  price_asc: 'Precio: menor a mayor',
  price_desc: 'Precio: mayor a menor',
  discount: 'Mayor descuento',
  newest: 'Más recientes',
  deal_score: 'Mejor oferta',
};