import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const conn = await mysql.createConnection({
  ...dbConfig,
  multipleStatements: false,
});

const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
for (const statement of sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'))) {
  await conn.query(statement);
}
await conn.end();
console.log('Schema aplicado: BD falabella_prices lista.');