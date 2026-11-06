import 'dotenv/config';
import { ikeaAdapter } from './stores/ikea.js';
import { upsertProductsBatch, closePool } from './db/repo.js';
import { detectCategory } from './collector.js';

const IKEA_TERMS = [
  'lampara',
  'lampara de mesa',
  'lampara de pie',
  'lampara de techo',
  'bombillo',
  'escritorio',
  'silla',
  'sofa',
  'cama',
  'colchon',
  'comedor',
  'estante',
  'closet',
  'persiana',
  'espejo',
  'mesa',
  'cortina',
  'almohada',
  'sabana',
  'organizador',
  'repisa',
];

async function main() {
  console.log('=== ACTUALIZACIÓN EN VIVO: IKEA CALI ===');
  let totalSaved = 0;
  const seenSkus = new Set<string>();

  for (const term of IKEA_TERMS) {
    try {
      const items = await ikeaAdapter.fetchListing('', { term });
      const unique = items.filter((i) => !seenSkus.has(i.sku));
      for (const i of unique) seenSkus.add(i.sku);

      if (unique.length > 0) {
        const batch = unique.map((p) => ({
          ...p,
          category: detectCategory(p.name, null, term),
          subcategory: term,
        }));
        const count = await upsertProductsBatch(batch, { store: 'ikea', city: 'Cali' });
        totalSaved += count;
        console.log(`  [IKEA] "${term}": ${unique.length} encontrados (${count} actualizados/guardados en DB)`);
      } else {
        console.log(`  [IKEA] "${term}": sin productos nuevos`);
      }
    } catch (err) {
      console.warn(`  [IKEA] Error en término "${term}":`, (err as Error).message);
    }
  }

  console.log(`\n¡Listo! Total productos de IKEA Cali procesados y actualizados: ${totalSaved}`);
  await closePool();
}

main().catch(console.error);
