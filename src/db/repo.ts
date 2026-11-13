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

export function productFingerprint(p: Pick<ScrapedProduct, 'price' | 'original_price' | 'stock'>): string {
  return `${p.price ?? ''}|${p.original_price ?? ''}|${p.stock ?? ''}`;
}

export interface UpsertOptions {
  store?: string;
  city?: string | null;
}

export async function upsertProductsBatch(items: ScrapedProduct[], opts: UpsertOptions = {}): Promise<number> {
  if (items.length === 0) return 0;
  const store = opts.store ?? 'falabella';
  const city = opts.city ?? null;
  const pool = await getPool();
  let lastErr: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conn.beginTransaction();
      await conn.query('INSERT IGNORE INTO stores (code, name) VALUES (?, ?)', [store, store.toUpperCase()]);

      const skus = Array.from(new Set(items.map((i) => i.sku))).sort();
      const inPlaceholders = skus.map(() => '?').join(', ');
      const [existingRows] = await conn.query<RowDataPacket[]>(
        `SELECT sku, id, price_hash FROM products WHERE store = ? AND sku IN (${inPlaceholders}) FOR UPDATE`,
        [store, ...skus]
      );
      const existing = new Map<string, { id: number; price_hash: string | null }>();
      for (const r of existingRows) {
        existing.set(r.sku as string, { id: Number(r.id), price_hash: r.price_hash as string | null });
      }

      const seen = new Set<string>();
      const all: ScrapedProduct[] = [];
      const changed: ScrapedProduct[] = [];
      for (const it of items) {
        if (seen.has(it.sku)) continue;
        seen.add(it.sku);
        all.push(it);
        const prev = existing.get(it.sku);
        if (!prev || prev.price_hash !== productFingerprint(it)) {
          changed.push(it);
        }
      }

      if (all.length === 0) {
        await conn.commit();
        return 0;
      }

      const allSorted = all.sort((a, b) => a.sku.localeCompare(b.sku));
      const changedSorted = changed.sort((a, b) => a.sku.localeCompare(b.sku));

      const values: (string | number | null)[] = [];
      const rowsSql: string[] = [];
      for (const it of allSorted) {
        rowsSql.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NOW())');
        values.push(
          store,
          it.sku,
          it.name,
          it.brand,
          it.category,
          it.subcategory,
          it.url,
          it.image_url,
          it.seller,
          productFingerprint(it),
          it.price,
          it.original_price
        );
      }
      await conn.query(
        `INSERT INTO products (store, sku, name, brand, category, subcategory, url, image_url, seller, active, price_hash, current_price, original_price, last_captured_at)
         VALUES ${rowsSql.join(', ')}
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           brand = VALUES(brand),
           category = VALUES(category),
           url = VALUES(url),
           image_url = VALUES(image_url),
           seller = VALUES(seller),
           active = 1,
           price_hash = VALUES(price_hash),
           current_price = VALUES(current_price),
           original_price = VALUES(original_price),
           last_captured_at = NOW()`,
        values
      );

      const idBySku = new Map<string, number>();
      for (const [sku, info] of existing) idBySku.set(sku, info.id);
      const newSkus = allSorted.filter((i) => !existing.has(i.sku)).map((i) => i.sku);
      if (newSkus.length > 0) {
        const ph = newSkus.map(() => '?').join(', ');
        const [idRows] = await conn.query<RowDataPacket[]>(
          `SELECT sku, id FROM products WHERE store = ? AND sku IN (${ph})`,
          [store, ...newSkus]
        );
        for (const r of idRows) idBySku.set(r.sku as string, Number(r.id));
      }

      const histValues: (string | number | boolean | null)[] = [];
      const histRows: string[] = [];
      for (const it of changedSorted) {
        if (it.price === null) continue;
        const pid = idBySku.get(it.sku);
        if (pid === undefined) continue;
        histRows.push('(?, ?, ?, ?, ?, ?)');
        histValues.push(pid, it.price, it.original_price, it.price, it.stock, city);
      }
      if (histRows.length > 0) {
        await conn.query(
          `INSERT INTO price_history (product_id, price, original_price, sale_price, stock, city)
           VALUES ${histRows.join(', ')}`,
          histValues
        );
      }

      await conn.commit();
      return changedSorted.length;
    } catch (err) {
      await conn.rollback();
      const e = err as any;
      const isRetryable = e?.code === 'ER_LOCK_DEADLOCK' || e?.code === 'ER_LOCK_WAIT_TIMEOUT';
      if (isRetryable && attempt < 3) {
        lastErr = err;
        const jitter = Math.floor(Math.random() * 500) + 200;
        await new Promise((r) => setTimeout(r, jitter));
        continue;
      }
      throw err;
    } finally {
      conn.release();
    }
  }
  throw lastErr ?? new Error('upsertProductsBatch failed after retries');
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
    `SELECT p.id, p.sku, p.name, p.url, p.category, p.current_price AS price, p.original_price, p.last_captured_at AS captured_at
     FROM products p
     WHERE p.active = 1 AND p.current_price IS NOT NULL
     ORDER BY p.current_price DESC`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    sku: r.sku as string,
    name: r.name as string,
    url: (r.url as string).replace(/^https?:\/\/tienda\.exito\.com/i, 'https://www.exito.com'),
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

const PRODUCT_SELECT = `p.id, p.store, p.sku, p.name, p.brand, p.category, p.seller, p.url, p.image_url,
            p.current_price AS price, p.original_price, p.last_captured_at AS captured_at`;

export async function searchProducts(query: string, limit = 20): Promise<ProductRow[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ${PRODUCT_SELECT}
     FROM products p
     WHERE p.active = 1 AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)
     ORDER BY p.current_price DESC
     LIMIT ?`,
    [`%${query}%`, `%${query}%`, `%${query}%`, limit]
  );
  return rows.map(mapProductRow);
}

export async function getProductBySku(sku: string): Promise<ProductRow | null> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT ${PRODUCT_SELECT}
     FROM products p
     WHERE p.sku = ? AND p.active = 1 LIMIT 1`,
    [sku]
  );
  return rows.length ? mapProductRow(rows[0]) : null;
}

function mapProductRow(r: RowDataPacket): ProductRow {
  return {
    id: Number(r.id),
    store: r.store as string,
    sku: r.sku as string,
    name: r.name as string,
    brand: (r.brand as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    seller: (r.seller as string | null) ?? null,
    url: (r.url as string).split(/[?#]/)[0].replace(/^https?:\/\/tienda\.exito\.com/i, 'https://www.exito.com'),
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

export interface ActiveDealRow {  sku: string;
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
  category?: string;
  store?: string;
  brand?: string;
  brands?: string[];
  skus?: string[];
  minPrice?: number;
  maxPrice?: number;
  dealOnly?: boolean;
  energyClassA?: boolean;
  minDiscount?: number;
  sort?: 'default' | 'price_asc' | 'price_desc' | 'discount' | 'newest' | 'deal_score';
}

const SORT_MAP: Record<NonNullable<ProductFilters['sort']>, string> = {
  default: 'p.current_price ASC',
  price_asc: 'p.current_price ASC',
  price_desc: 'p.current_price DESC',
  discount:
    '(p.original_price IS NULL OR p.original_price <= p.current_price), (p.current_price / NULLIF(p.original_price, 0)) ASC, p.current_price ASC',
  newest: 'p.created_at DESC',
  deal_score:
    '(SELECT MAX(dd.deal_score) FROM deals dd WHERE dd.product_id = p.id AND dd.status = "active") DESC',
};

function buildProductWhere(f: ProductFilters): { sql: string; params: (string | number)[] } {
  const clauses: string[] = ['p.current_price IS NOT NULL'];
  const params: (string | number)[] = [];
  const qNorm = (f.query ?? '').toLowerCase().trim();

  if (f.store) {
    clauses.push('p.store = ?');
    params.push(f.store);
  }

  // Exact Category Filtering
  if (f.category === 'Muebles y Hogar') {
    clauses.push("p.category IN ('Muebles y Hogar', 'Hogar y Variados')");
  } else if (f.category) {
    clauses.push('p.category = ?');
    params.push(f.category);
  }

  // Intelligent Search Term Matching & Synonyms
  if (qNorm) {
    if (/\b(airfryer|freidora)\b/i.test(qNorm)) {
      clauses.push('(p.name LIKE ? OR p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
      params.push('%freidora%', '%airfryer%', `%${f.query}%`, `%${f.query}%`);
    } else if (/\b(nevera|neveras|nevecon|nevecón|refrigerador)\b/i.test(qNorm)) {
      clauses.push('(p.name LIKE ? OR p.name LIKE ? OR p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
      params.push('%nevera%', '%nevecon%', '%refrigerador%', `%${f.query}%`, `%${f.query}%`);
      clauses.push(
        "p.name NOT REGEXP 'portatil|portátil|camping|icopor|hielera|cava|vinos|botellas|silla|organizador|base para|soporte|protector|forro|iman|imán|filtro|repuesto|dispensador de agua'"
      );
    } else if (/\b(lampara|lámpara|iluminacion|iluminación)\b/i.test(qNorm)) {
      clauses.push('(p.name LIKE ? OR p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
      params.push('%lampara%', '%lámpara%', `%${f.query}%`, `%${f.query}%`);
    } else {
      clauses.push('(p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)');
      params.push(`%${f.query}%`, `%${f.query}%`, `%${f.query}%`);
    }
  }

  if (f.energyClassA) {
    clauses.push(
      "p.name REGEXP 'inverter|tipo a|clase a|eficiencia a|ahorro|no frost|ert|erb|rmu|rma|himalaya|austria|lumina|lúmina|cr239|cr256|cr 239|cr 256|n220|n250|nev 207|bcd|rt2|rlh|mdrd|ri-|k-n|h4160|h6161'"
    );
    clauses.push(
      "p.name NOT REGEXP 'portatil|portátil|camping|icopor|hielera|cava|vinos|botellas'"
    );
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
    clauses.push('p.current_price >= ?');
    params.push(f.minPrice);
  }
  if (f.maxPrice !== undefined) {
    clauses.push('p.current_price <= ?');
    params.push(f.maxPrice);
  }
  if (f.minDiscount !== undefined && f.minDiscount > 0) {
    clauses.push('p.original_price IS NOT NULL AND p.original_price > p.current_price');
    clauses.push('((p.original_price - p.current_price) / p.original_price * 100) >= ?');
    params.push(f.minDiscount);
  }
  if (f.dealOnly) {
    clauses.push(
      "((p.original_price IS NOT NULL AND p.original_price > p.current_price) OR EXISTS (SELECT 1 FROM deals dd WHERE dd.product_id = p.id AND dd.status = 'active'))"
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
  store_counts?: Record<string, number>;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE active = 1) AS products,
       (SELECT COUNT(*) FROM price_history) AS price_records,
       (SELECT COUNT(*) FROM deals WHERE status = 'active') AS active_deals,
       (SELECT COUNT(DISTINCT category) FROM products WHERE active = 1) AS categories`
  );
  const [storeRows] = await pool.query<RowDataPacket[]>(
    `SELECT store, COUNT(*) as count FROM products WHERE active = 1 GROUP BY store`
  );
  const storeCounts: Record<string, number> = {};
  for (const r of storeRows) {
    storeCounts[r.store] = Number(r.count);
  }
  return {
    products: Number(rows[0].products),
    price_records: Number(rows[0].price_records),
    active_deals: Number(rows[0].active_deals),
    categories: Number(rows[0].categories),
    store_counts: storeCounts,
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
    url: (r.url as string).replace(/^https?:\/\/tienda\.exito\.com/i, 'https://www.exito.com'),
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

export interface GroupableProduct {
  id: number;
  store: string;
  sku: string;
  name: string;
  brand: string | null;
  price: number | null;
  original_price: number | null;
}

export async function getGroupableProducts(): Promise<GroupableProduct[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT p.id, p.store, p.sku, p.name, p.brand, p.current_price AS price, p.original_price
     FROM products p
     WHERE p.active = 1 AND p.current_price IS NOT NULL`
  );
  return rows.map((r) => ({
    id: Number(r.id),
    store: r.store as string,
    sku: r.sku as string,
    name: r.name as string,
    brand: (r.brand as string | null) ?? null,
    price: r.price === null ? null : Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
  }));
}

export interface GroupRow {
  id: number;
  name: string;
  brand: string | null;
  members: number;
}

export async function listGroups(query?: string, limit = 20): Promise<GroupRow[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT g.id, g.name, g.brand, COUNT(pm.product_id) AS members
     FROM product_groups g
     JOIN product_group_members pm ON pm.group_id = g.id
     ${query ? 'WHERE g.name LIKE ?' : ''}
     GROUP BY g.id, g.name, g.brand
     ORDER BY members DESC
     LIMIT ?`,
    query ? [`%${query}%`, limit] : [limit]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name as string,
    brand: (r.brand as string | null) ?? null,
    members: Number(r.members),
  }));
}

export interface GroupMemberRow {
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

export async function getGroupMembers(groupId: number): Promise<GroupMemberRow[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT p.store, p.sku, p.name, p.url, p.image_url, p.brand, ph.price, ph.original_price, ph.city
     FROM product_group_members pm
     JOIN products p ON p.id = pm.product_id
     JOIN price_history ph ON ph.id = (
       SELECT MAX(ph2.id) FROM price_history ph2 WHERE ph2.product_id = p.id
     )
     WHERE pm.group_id = ?
     ORDER BY ph.price ASC`,
    [groupId]
  );
  return rows.map((r) => ({
    store: r.store as string,
    sku: r.sku as string,
    name: r.name as string,
    url: (r.url as string).replace(/^https?:\/\/tienda\.exito\.com/i, 'https://www.exito.com'),
    image_url: (r.image_url as string | null) ?? null,
    brand: (r.brand as string | null) ?? null,
    price: r.price === null ? null : Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
    city: (r.city as string | null) ?? null,
  }));
}

export async function createGroup(name: string, brand: string | null, productIds: number[]): Promise<number> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query<ResultSetHeader>(
      'INSERT INTO product_groups (name, brand) VALUES (?, ?)',
      [name, brand]
    );
    const groupId = res.insertId;
    if (productIds.length > 0) {
      const ph = productIds.map(() => '?').join(', ');
      await conn.query(
        `INSERT IGNORE INTO product_group_members (group_id, product_id) SELECT ?, id FROM products WHERE id IN (${ph})`,
        [groupId, ...productIds]
      );
    }
    await conn.commit();
    return Number(groupId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function clearGroups(): Promise<void> {
  await (await getPool()).query('DELETE FROM product_groups');
}

export async function findGroupByProduct(productId: number): Promise<number | null> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT group_id FROM product_group_members WHERE product_id = ? LIMIT 1`,
    [productId]
  );
  return rows.length ? Number(rows[0].group_id) : null;
}

export async function findGroupBySku(store: string, sku: string): Promise<number | null> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT pm.group_id
     FROM product_group_members pm
     JOIN products p ON p.id = pm.product_id
     WHERE p.store = ? AND p.sku = ? LIMIT 1`,
    [store, sku]
  );
  return rows.length ? Number(rows[0].group_id) : null;
}

export interface CategoryStat {
  category: string;
  total: number;
  deals: number;
}

export async function getCategories(): Promise<CategoryStat[]> {
  const [rows] = await (await getPool()).query<RowDataPacket[]>(
    `SELECT p.category, 
            COUNT(*) AS total,
            SUM(CASE WHEN (p.original_price IS NOT NULL AND p.original_price > p.current_price) OR EXISTS (SELECT 1 FROM deals d WHERE d.product_id = p.id AND d.status = 'active') THEN 1 ELSE 0 END) AS deals
     FROM products p
     WHERE p.active = 1 AND p.category IS NOT NULL
     GROUP BY p.category
     ORDER BY total DESC`
  );
  return rows.map((r) => ({
    category: r.category as string,
    total: Number(r.total),
    deals: Number(r.deals),
  }));
}
