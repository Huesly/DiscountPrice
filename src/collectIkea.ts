import 'dotenv/config';
import { ikeaAdapter } from './stores/ikea.js';
import { upsertProductsBatch, getProductCount, getPriceHistoryCount, closePool } from './db/repo.js';
import { detectCategory } from './collector.js';
import { runMatcher } from './match.js';

const IKEA_SEARCH_TERMS = [
  // 1. Lámparas para el Hogar (pedido específico del usuario)
  { term: 'lampara', subcategory: 'Lámparas para Hogar' },
  { term: 'lampara de mesa', subcategory: 'Lámparas de Mesa' },
  { term: 'lampara de pie', subcategory: 'Lámparas de Pie' },
  { term: 'lampara de techo', subcategory: 'Lámparas de Techo' },
  { term: 'bombillo', subcategory: 'Bombillos e Iluminación' },

  // 2. Muebles y Hogar más buscados en IKEA Cali
  { term: 'escritorio', subcategory: 'Muebles de Oficina' },
  { term: 'silla', subcategory: 'Sillas' },
  { term: 'silla de oficina', subcategory: 'Sillas de Oficina' },
  { term: 'mesa', subcategory: 'Mesas' },
  { term: 'mesa de noche', subcategory: 'Mesas de Noche' },
  { term: 'estante', subcategory: 'Estantes y Repisas' },
  { term: 'closet', subcategory: 'Closets y Armarios' },
  { term: 'sofa', subcategory: 'Sofás' },
  { term: 'cama', subcategory: 'Camas' },
  { term: 'colchon', subcategory: 'Colchones' },
  { term: 'espejo', subcategory: 'Espejos' },
  { term: 'organizador', subcategory: 'Organizadores' },
];

async function main() {
  console.log('=== COLECTANDO CATÁLOGO IKEA COLOMBIA (SEDE CALI) ===\n');
  const start = Date.now();
  let totalWritten = 0;
  const store = 'ikea';
  const city = 'Cali';

  for (const item of IKEA_SEARCH_TERMS) {
    console.log(`[IKEA Cali] Consultando "${item.term}" (${item.subcategory})...`);
    try {
      const products = await ikeaAdapter.fetchListing('', {
        term: item.term,
        city: 'Cali',
      });

      if (!products || products.length === 0) {
        console.log(`  -> Sin productos para "${item.term}"`);
        continue;
      }

      const category = detectCategory(item.term, item.subcategory);
      const batch = products.map((p) => ({
        ...p,
        seller: 'IKEA Cali',
        category,
        subcategory: item.subcategory,
      }));

      const written = await upsertProductsBatch(batch, { store, city });
      totalWritten += written;
      console.log(`  -> ${products.length} productos obtenidos (${written} guardados/actualizados)`);

      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.warn(`  -> Error en "${item.term}": ${(err as Error).message}`);
    }
  }

  console.log('\n=== EJECUTANDO MATCHER MULTI-TIENDA CON IKEA ===');
  try {
    await runMatcher(true);
    console.log('Matcher completado con éxito.');
  } catch (err) {
    console.warn('Advertencia en matcher:', (err as Error).message);
  }

  const [totalProducts, totalHistory] = await Promise.all([
    getProductCount(),
    getPriceHistoryCount(),
  ]);

  console.log('\n==========================================');
  console.log(`PRODUCTOS IKEA ESCRITOS/ACTUALIZADOS : ${totalWritten}`);
  console.log(`TOTAL PRODUCTOS EN BASE DE DATOS    : ${totalProducts}`);
  console.log(`TOTAL HISTORIAL DE PRECIOS          : ${totalHistory}`);
  console.log(`TIEMPO TOTAL                        : ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log('==========================================');

  await closePool();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Error fatal:', e);
  await closePool();
  process.exit(1);
});
