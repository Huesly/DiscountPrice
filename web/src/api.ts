export interface Stats {
  products: number;
  price_records: number;
  active_deals: number;
  categories: number;
  store_counts?: Record<string, number>;
}

export interface ProductRow {
  id: number;
  store: string;
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

export interface CategoryStat {
  category: string;
  total: number;
  deals: number;
}

export interface ProductFilters {
  query?: string;
  category?: string;
  store?: string;
  brands?: string[];
  skus?: string[];
  minPrice?: number;
  maxPrice?: number;
  dealOnly?: boolean;
  energyClassA?: boolean;
  minDiscount?: number;
  favOnly?: boolean;
  sort?: SortKey;
}

export interface GroupRow {
  id: number;
  name: string;
  brand: string | null;
  members: number;
}

export interface GroupMember {
  store: string;
  sku: string;
  name: string;
  url: string;
  image_url: string | null;
  brand: string | null;
  price: number | null;
  original_price: number | null;
  city: string | null;
}

export interface GroupDetail {
  id: number;
  members: GroupMember[];
  min_price: number | null;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
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
  products: (f: ProductFilters = {}, limit = 24, offset = 0, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (f.query) q.set('query', f.query);
    if (f.store) q.set('store', f.store);
    if (f.brands && f.brands.length) q.set('brands', f.brands.join(','));
    if (f.skus && f.skus.length) q.set('skus', f.skus.join(','));
    if (f.minPrice !== undefined) q.set('minPrice', String(f.minPrice));
    if (f.maxPrice !== undefined) q.set('maxPrice', String(f.maxPrice));
    if (f.category) q.set('category', f.category);
    if (f.minDiscount !== undefined) q.set('minDiscount', String(f.minDiscount));
    if (f.dealOnly) q.set('dealOnly', 'true');
    if (f.energyClassA) q.set('energyClassA', 'true');
    if (f.sort && f.sort !== 'default') q.set('sort', f.sort);
    q.set('limit', String(limit));
    q.set('offset', String(offset));
    return get<{ total: number; items: ProductRow[] }>(`/api/products?${q.toString()}`, signal);
  },
  brands: () => get<string[]>('/api/brands'),
  categories: () => get<CategoryStat[]>('/api/categories'),
  collectFood: () => post<{ totalCollected: number; termsProcessed: number; matched?: any }>('/api/collect/food'),
  product: (sku: string) => get<ProductRow>(`/api/products/${sku}`),
  history: (sku: string) => get<HistoryPoint[]>(`/api/products/${sku}/history?limit=200`),
  statsFor: (sku: string) => get<{ product: ProductRow | null; stats: PriceStats }>(`/api/products/${sku}/stats`),
  deals: () => get<Deal[]>('/api/deals?limit=12'),
  collect: (term: string, store = 'all') =>
    post<{ term: string; store: string; added: number; matched?: any }>(
      `/api/collect?term=${encodeURIComponent(term)}&store=${encodeURIComponent(store)}`
    ),
  groups: (query = '', limit = 20) =>
    get<GroupRow[]>(`/api/groups?query=${encodeURIComponent(query)}&limit=${limit}`),
  group: (id: number) => get<GroupDetail>(`/api/groups/${id}`),
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

export const STORE_LABELS: Record<string, string> = {
  falabella: 'Falabella',
  exito: 'Éxito',
  homecenter: 'Homecenter',
  alkosto: 'Alkosto',
  ikea: 'IKEA Cali',
  d1: 'D1',
  ara: 'Ara',
};