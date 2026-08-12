import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createPool } from './db.js';

export interface ScrapedProduct {
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  subcategory: string | null;
  url: string;
  image_url: string | null;
  seller: string | null;
  price: number | null;
  original_price: number | null;
  stock: boolean | null;
}

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!pool) pool = await createPool();
  return pool;
}

export async function upsertProductWithPrice(p: ScrapedProduct): Promise<void> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO products (sku, name, brand, category, subcategory, url, image_url, seller, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         brand = VALUES(brand),
         category = VALUES(category),
         url = VALUES(url),
         image_url = VALUES(image_url),
         seller = VALUES(seller),
         active = 1`,
      [p.sku, p.name, p.brand, p.category, p.subcategory, p.url, p.image_url, p.seller]
    );

    const productId =
      result.insertId !== 0 ? result.insertId : await getProductIdBySku(conn, p.sku);

    if (p.price !== null) {
      await conn.query(
        `INSERT INTO price_history (product_id, price, original_price, sale_price, stock)
         VALUES (?, ?, ?, ?, ?)`,
        [productId, p.price, p.original_price, p.original_price, p.stock]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getProductIdBySku(conn: unknown, sku: string): Promise<number> {
  const [rows] = await (conn as import('mysql2/promise').PoolConnection).query<RowDataPacket[]>(
    'SELECT id FROM products WHERE sku = ?',
    [sku]
  );
  if (rows.length === 0) throw new Error(`Producto no encontrado por sku ${sku}`);
  return Number(rows[0].id);
}

export async function getProductCount(): Promise<number> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM products');
  return Number(rows[0].c);
}

export async function getPriceHistoryCount(): Promise<number> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM price_history');
  return Number(rows[0].c);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export interface ProductWithLatestPrice {
  id: number;
  sku: string;
  name: string;
  url: string;
  category: string;
  price: number;
  original_price: number | null;
  captured_at: string;
}

export async function getProductsWithLatestPrice(): Promise<ProductWithLatestPrice[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT p.id, p.sku, p.name, p.url, p.category, ph.price, ph.original_price, ph.captured_at
     FROM products p
     JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE p.active = 1
     ORDER BY ph.price DESC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    sku: r.sku as string,
    name: r.name as string,
    url: r.url as string,
    category: r.category as string,
    price: Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
    captured_at: r.captured_at as string,
  }));
}

export async function getPriceWindow(productId: number, days: number): Promise<number[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT price FROM price_history
     WHERE product_id = ? AND captured_at >= NOW() - INTERVAL ? DAY
     ORDER BY captured_at ASC`,
    [productId, days]
  );
  return rows.map((r) => Number(r.price));
}

export async function getMinPrice(productId: number): Promise<number | null> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    'SELECT MIN(price) AS m FROM price_history WHERE product_id = ?',
    [productId]
  );
  return rows[0].m === null ? null : Number(rows[0].m);
}

export async function expireProductDeals(productId: number): Promise<void> {
  await (await getPool()).query(
    `UPDATE deals SET status = 'expired', detected_at = NOW()
     WHERE product_id = ? AND status = 'active'`,
    [productId]
  );
}

export interface DealRecord {
  productId: number;
  price: number;
  minHistorical: number | null;
  avg30d: number | null;
  discountPct: number | null;
  dealScore: number;
}

export async function insertDeal(deal: DealRecord): Promise<void> {
  await (await getPool()).query(
    `INSERT INTO deals (product_id, price, min_historical, avg_30d, discount_pct, deal_score, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [
      deal.productId,
      deal.price,
      deal.minHistorical,
      deal.avg30d,
      deal.discountPct,
      deal.dealScore,
    ]
  );
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

const PRODUCT_SELECT = `p.id, p.sku, p.name, p.brand, p.category, p.seller, p.url, p.image_url,
            ph.price, ph.original_price, ph.captured_at`;

export async function searchProducts(query: string, limit = 20): Promise<ProductRow[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ${PRODUCT_SELECT}
     FROM products p
     LEFT JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE p.active = 1 AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)
     ORDER BY ph.price DESC
     LIMIT ?`,
    [`%${query}%`, `%${query}%`, `%${query}%`, limit]
  );
  return rows.map(mapProductRow);
}

export async function getProductBySku(sku: string): Promise<ProductRow | null> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ${PRODUCT_SELECT}
     FROM products p
     LEFT JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE p.sku = ? AND p.active = 1 LIMIT 1`,
    [sku]
  );
  return rows.length ? mapProductRow(rows[0]) : null;
}

function mapProductRow(r: RowDataPacket): ProductRow {
  return {
    id: Number(r.id),
    sku: r.sku as string,
    name: r.name as string,
    brand: (r.brand as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    seller: (r.seller as string | null) ?? null,
    url: (r.url as string).split(/[?#]/)[0],
    image_url: (r.image_url as string | null) ?? null,
    price: r.price === null ? null : Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
    captured_at: (r.captured_at as string | null) ?? null,
  };
}

export interface HistoryPoint {
  price: number;
  original_price: number | null;
  stock: boolean | null;
  captured_at: string;
}

export async function getPriceHistory(sku: string, limit = 100): Promise<HistoryPoint[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ph.price, ph.original_price, ph.stock, ph.captured_at
     FROM price_history ph
     JOIN products p ON p.id = ph.product_id
     WHERE p.sku = ? AND p.active = 1
     ORDER BY ph.captured_at DESC
     LIMIT ?`,
    [sku, limit]
  );
  return rows.map((r) => ({
    price: Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
    stock: r.stock === null ? null : Boolean(r.stock),
    captured_at: r.captured_at as string,
  }));
}

export interface PriceStats {
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  median: number | null;
  samples: number;
}

export async function getPriceStats(sku: string): Promise<PriceStats> {
  const rows = await getPriceHistory(sku, 100000);
  const prices = rows.map((r) => r.price);
  if (prices.length === 0) {
    return { current: null, min: null, max: null, avg: null, median: null, samples: 0 };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    current: rows[0].price,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    median,
    samples: prices.length,
  };
}

export interface ActiveDealRow {
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

export interface ProductFilters {
  query?: string;
  brand?: string;
  brands?: string[];
  skus?: string[];
  minPrice?: number;
  maxPrice?: number;
  dealOnly?: boolean;
  sort?: 'default' | 'price_asc' | 'price_desc' | 'discount' | 'newest' | 'deal_score';
}

const SORT_MAP: Record<NonNullable<ProductFilters['sort']>, string> = {
  default: 'ph.price DESC',
  price_asc: 'ph.price ASC',
  price_desc: 'ph.price DESC',
  discount:
    '(ph.price / NULLIF(ph.original_price, 0)) IS NULL, (ph.price / NULLIF(ph.original_price, 0)) ASC',
  newest: 'p.created_at DESC',
  deal_score:
    '(SELECT MAX(dd.deal_score) FROM deals dd WHERE dd.product_id = p.id AND dd.status = "active") DESC',
};

function buildProductWhere(f: ProductFilters): { sql: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (f.query) {
    clauses.push('(p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
    params.push(`%${f.query}%`, `%${f.query}%`, `%${f.query}%`);
  }
  if (f.brand) {
    clauses.push('p.brand = ?');
    params.push(f.brand);
  }
  if (f.brands && f.brands.length > 0) {
    clauses.push(`p.brand IN (${f.brands.map(() => '?').join(', ')})`);
    params.push(...f.brands);
  }
  if (f.skus && f.skus.length > 0) {
    clauses.push(`p.sku IN (${f.skus.map(() => '?').join(', ')})`);
    params.push(...f.skus);
  }
  if (f.minPrice !== undefined) {
    clauses.push('ph.price >= ?');
    params.push(f.minPrice);
  }
  if (f.maxPrice !== undefined) {
    clauses.push('ph.price <= ?');
    params.push(f.maxPrice);
  }
  if (f.dealOnly) {
    clauses.push(
      "EXISTS (SELECT 1 FROM deals dd WHERE dd.product_id = p.id AND dd.status = 'active')"
    );
  }
  return {
    sql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

export async function listProducts(
  f: ProductFilters,
  limit = 24,
  offset = 0
): Promise<ProductRow[]> {
  const { sql, params } = buildProductWhere(f);
  params.push(limit, offset);
  const orderBy = SORT_MAP[f.sort ?? 'default'];
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ${PRODUCT_SELECT}
     FROM products p
     LEFT JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE p.active = 1 ${sql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    params
  );
  return rows.map(mapProductRow);
}

export async function countProducts(f: ProductFilters): Promise<number> {
  const { sql, params } = buildProductWhere(f);
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM products p
     LEFT JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE p.active = 1 ${sql}`,
    params
  );
  return Number(rows[0].c);
}

export async function getBrands(): Promise<string[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT DISTINCT brand FROM products
     WHERE active = 1 AND brand IS NOT NULL AND brand <> ''
     ORDER BY brand ASC`
  );
  return rows.map((r) => r.brand as string);
}

export interface GlobalStats {
  products: number;
  price_records: number;
  active_deals: number;
  categories: number;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE active = 1) AS products,
       (SELECT COUNT(*) FROM price_history) AS price_records,
       (SELECT COUNT(*) FROM deals WHERE status = 'active') AS active_deals,
       (SELECT COUNT(DISTINCT category) FROM products WHERE active = 1) AS categories`
  );
  return {
    products: Number(rows[0].products),
    price_records: Number(rows[0].price_records),
    active_deals: Number(rows[0].active_deals),
    categories: Number(rows[0].categories),
  };
}

export async function getActiveDeals(limit = 20): Promise<ActiveDealRow[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT p.sku, p.name, p.url, p.image_url, p.brand, d.price, d.min_historical, d.avg_30d,
            d.discount_pct, d.deal_score, d.detected_at
     FROM deals d
     JOIN products p ON p.id = d.product_id
     WHERE d.status = 'active'
     ORDER BY d.deal_score DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    sku: r.sku as string,
    name: r.name as string,
    url: r.url as string,
    image_url: (r.image_url as string | null) ?? null,
    brand: (r.brand as string | null) ?? null,
    price: Number(r.price),
    min_historical: r.min_historical === null ? null : Number(r.min_historical),
    avg_30d: r.avg_30d === null ? null : Number(r.avg_30d),
    discount_pct: r.discount_pct === null ? null : Number(r.discount_pct),
    deal_score: r.deal_score === null ? null : Number(r.deal_score),
    detected_at: r.detected_at as string,
  }));
}