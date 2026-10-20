import 'dotenv/config';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

const conn = await mysql.createConnection({
  ...dbConfig,
  database: process.env.DB_NAME ?? 'falabella_prices',
});

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

async function indexExists(table: string, index: string): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index]
  );
  return Number(rows[0].c) > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0].c) > 0;
}

async function migrate() {
  await conn.query('CREATE TABLE IF NOT EXISTS stores (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  await conn.query("INSERT IGNORE INTO stores (code, name) VALUES ('falabella', 'Falabella'), ('exito', 'Éxito'), ('homecenter', 'Homecenter')");

  if (!(await columnExists('products', 'store'))) {
    await conn.query("ALTER TABLE products ADD COLUMN store VARCHAR(30) NOT NULL DEFAULT 'falabella' AFTER id");
  }
  if (!(await columnExists('price_history', 'city'))) {
    await conn.query('ALTER TABLE price_history ADD COLUMN city VARCHAR(60) DEFAULT NULL AFTER stock');
  }
  if (await indexExists('products', 'sku')) {
    await conn.query('ALTER TABLE products DROP INDEX sku');
  }
  if (!(await indexExists('products', 'uq_store_sku'))) {
    await conn.query('ALTER TABLE products ADD UNIQUE KEY uq_store_sku (store, sku)');
  }

  const [fks] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'fk_product_store'`
  );
  if (Number(fks[0].c) === 0) {
    await conn.query('ALTER TABLE products ADD CONSTRAINT fk_product_store FOREIGN KEY (store) REFERENCES stores(code) ON UPDATE CASCADE');
  }

  if (!(await tableExists('product_groups'))) {
    await conn.query('CREATE TABLE product_groups (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(300) NOT NULL, brand VARCHAR(200) DEFAULT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_product_groups_brand (brand)) ENGINE=InnoDB');
  }
  if (!(await tableExists('product_group_members'))) {
    await conn.query('CREATE TABLE product_group_members (group_id BIGINT UNSIGNED NOT NULL, product_id BIGINT UNSIGNED NOT NULL, PRIMARY KEY (group_id, product_id), CONSTRAINT fk_pgm_group FOREIGN KEY (group_id) REFERENCES product_groups(id) ON DELETE CASCADE, CONSTRAINT fk_pgm_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE, KEY idx_pgm_product (product_id)) ENGINE=InnoDB');
  }

  // Desnormalización de precio para búsquedas y filtros ultrarrápidos sin subconsultas correlacionadas
  if (!(await columnExists('products', 'current_price'))) {
    await conn.query('ALTER TABLE products ADD COLUMN current_price DECIMAL(12,2) DEFAULT NULL AFTER price_hash');
  }
  if (!(await columnExists('products', 'original_price'))) {
    await conn.query('ALTER TABLE products ADD COLUMN original_price DECIMAL(12,2) DEFAULT NULL AFTER current_price');
  }
  if (!(await columnExists('products', 'last_captured_at'))) {
    await conn.query('ALTER TABLE products ADD COLUMN last_captured_at TIMESTAMP NULL DEFAULT NULL AFTER original_price');
  }
  if (!(await indexExists('products', 'idx_products_price'))) {
    await conn.query('ALTER TABLE products ADD KEY idx_products_price (current_price)');
  }
  if (!(await indexExists('products', 'idx_products_store_price'))) {
    await conn.query('ALTER TABLE products ADD KEY idx_products_store_price (store, current_price)');
  }

  // Backfill de precios actuales existentes desde price_history
  await conn.query(`
    UPDATE products p
    JOIN (
      SELECT ph.product_id, ph.price, ph.original_price, ph.captured_at
      FROM price_history ph
      JOIN (
        SELECT product_id, MAX(id) AS max_id
        FROM price_history
        GROUP BY product_id
      ) m ON ph.id = m.max_id
    ) latest ON p.id = latest.product_id
    SET p.current_price = latest.price,
        p.original_price = latest.original_price,
        p.last_captured_at = latest.captured_at
    WHERE p.current_price IS NULL
  `);

  console.log('Migración multi-tienda y optimización de índices aplicada con éxito.');
}

try {
  await migrate();
} finally {
  await conn.end();
}