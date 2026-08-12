import 'dotenv/config';
import { createPool } from './db/db.js';
import { closePool } from './db/repo.js';

const pool = await createPool();

const [[before]] = await pool.query<import('mysql2').RowDataPacket[]>(
  'SELECT COUNT(*) n FROM price_history'
);
console.log(`price_history antes: ${before.n}`);

const [del] = await pool.query<import('mysql2').ResultSetHeader>(
  `DELETE ph1 FROM price_history ph1
   JOIN (
     SELECT product_id,
            DATE_FORMAT(captured_at, '%Y-%m-%d %H:%i') grp,
            price, original_price, sale_price, stock,
            MIN(id) keep_id
     FROM price_history
     GROUP BY product_id, grp, price, original_price, sale_price, stock
   ) keep
   ON ph1.product_id = keep.product_id
      AND DATE_FORMAT(ph1.captured_at, '%Y-%m-%d %H:%i') = keep.grp
      AND ph1.price <=> keep.price
      AND ph1.original_price <=> keep.original_price
      AND ph1.sale_price <=> keep.sale_price
      AND ph1.stock <=> keep.stock
      AND ph1.id <> keep.keep_id`
);

const [[after]] = await pool.query<import('mysql2').RowDataPacket[]>(
  'SELECT COUNT(*) n FROM price_history'
);
console.log(`Duplicados eliminados : ${del.affectedRows}`);
console.log(`price_history después: ${after.n}`);

await closePool();
