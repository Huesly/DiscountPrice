CREATE DATABASE IF NOT EXISTS falabella_prices
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE falabella_prices;

CREATE TABLE IF NOT EXISTS stores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  store VARCHAR(30) NOT NULL DEFAULT 'falabella',
  sku VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  brand VARCHAR(200) DEFAULT NULL,
  category VARCHAR(200) DEFAULT NULL,
  subcategory VARCHAR(200) DEFAULT NULL,
  url TEXT NOT NULL,
  image_url TEXT DEFAULT NULL,
  seller VARCHAR(200) DEFAULT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  price_hash VARCHAR(64) DEFAULT NULL,
  current_price DECIMAL(12,2) DEFAULT NULL,
  original_price DECIMAL(12,2) DEFAULT NULL,
  last_captured_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_sku (store, sku),
  KEY idx_products_category (category),
  KEY idx_products_active (active),
  KEY idx_products_price (current_price),
  KEY idx_products_store_price (store, current_price),
  CONSTRAINT fk_product_store FOREIGN KEY (store) REFERENCES stores(code) ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS price_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  original_price DECIMAL(12,2) DEFAULT NULL,
  sale_price DECIMAL(12,2) DEFAULT NULL,
  stock TINYINT(1) DEFAULT NULL,
  city VARCHAR(60) DEFAULT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_price_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_price_product (product_id, captured_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  min_historical DECIMAL(12,2) DEFAULT NULL,
  avg_30d DECIMAL(12,2) DEFAULT NULL,
  discount_pct DECIMAL(5,2) DEFAULT NULL,
  deal_score DECIMAL(6,2) DEFAULT NULL,
  status ENUM('active','expired') NOT NULL DEFAULT 'active',
  detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_deals_status (status, deal_score)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_groups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  brand VARCHAR(200) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_product_groups_brand (brand)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_group_members (
  group_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (group_id, product_id),
  CONSTRAINT fk_pgm_group FOREIGN KEY (group_id) REFERENCES product_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_pgm_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_pgm_product (product_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO stores (code, name) VALUES ('falabella', 'Falabella'), ('exito', 'Éxito'), ('homecenter', 'Homecenter'), ('alkosto', 'Alkosto');