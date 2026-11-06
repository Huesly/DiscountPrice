import 'dotenv/config';
import { collectTerm, collectFoodDeals } from './collector.js';
import { runMatcher } from './match.js';
import { closePool, getProductCount, getPriceHistoryCount } from './db/repo.js';

async function main() {
  console.log('=== ACTUALIZANDO INFORMACIÓN FRESCA (TIENDAS MULTIPLES) ===');
  const start = Date.now();

  // 1. Neveras y refrigeración (solicitado específicamente)
  console.log('\n[1/3] Colectando neveras en Falabella, Éxito, Alkosto y Homecenter...');
  try {
    const neverasCount = await collectTerm('nevera', 'Refrigeración', 'all');
    console.log(`-> Neveras colectadas/actualizadas: ${neverasCount}`);
  } catch (e) {
    console.warn('Advertencia colectando neveras:', (e as Error).message);
  }

  // 2. Muebles populares (escritorios, sillas)
  console.log('\n[2/3] Colectando muebles más buscados (escritorio, silla ergonómica)...');
  try {
    const escCount = await collectTerm('escritorio', 'Muebles de Oficina', 'all');
    console.log(`-> Escritorios colectados: ${escCount}`);
    const sillaCount = await collectTerm('silla de oficina', 'Sillas', 'all');
    console.log(`-> Sillas colectadas: ${sillaCount}`);
  } catch (e) {
    console.warn('Advertencia colectando muebles:', (e as Error).message);
  }

  // 3. Comidas y Supermercado (D1, Ara + Éxito alimentos esenciales)
  console.log('\n[3/3] Sincronizando catálogo fresco de Comidas (D1, Ara y Supermercado)...');
  try {
    const foodRes = await collectFoodDeals();
    console.log(`-> Alimentos procesados: ${foodRes.totalCollected} ítems (${foodRes.termsProcessed} categorías)`);
  } catch (e) {
    console.warn('Advertencia colectando comidas:', (e as Error).message);
  }

  // 4. Ejecutar el matcher de productos similares entre tiendas
  console.log('\n=== EJECUTANDO MATCHER MULTI-TIENDA ===');
  try {
    const matched = await runMatcher(true);
    console.log('Matcher completado con éxito.');
  } catch (e) {
    console.warn('Advertencia en matcher:', (e as Error).message);
  }

  const [totalProducts, totalHistory] = await Promise.all([
    getProductCount(),
    getPriceHistoryCount(),
  ]);

  console.log('\n==========================================');
  console.log(`TOTAL PRODUCTOS EN BASE DE DATOS: ${totalProducts}`);
  console.log(`TOTAL HISTORIAL DE PRECIOS      : ${totalHistory}`);
  console.log(`TIEMPO TRANSCURRIDO             : ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log('==========================================');

  await closePool();
}

main().catch(async (err) => {
  console.error('Error general:', err);
  await closePool();
  process.exit(1);
});
