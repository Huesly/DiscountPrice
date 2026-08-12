import 'dotenv/config';
import {
  getProductsWithLatestPrice,
  getPriceWindow,
  getMinPrice,
  expireProductDeals,
  insertDeal,
  getProductCount,
  getPriceHistoryCount,
  closePool,
} from './db/repo.js';

const WINDOW_DAYS = Number(process.env.DEAL_WINDOW_DAYS ?? 30);
const DEAL_MIN_PRICE_DROP = Number(process.env.DEAL_MIN_PRICE_DROP ?? 0.08);
const DEAL_MIN_ORIGINAL_DROP = Number(process.env.DEAL_MIN_ORIGINAL_DROP ?? 0.2);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function main() {
  const start = Date.now();
  console.log(`\n=== ANALYZER FALABELLA ===`);
  console.log(
    `Ventana: ${WINDOW_DAYS}d | Deal si: -${(DEAL_MIN_PRICE_DROP * 100).toFixed(0)}% vs avg30 O -${(DEAL_MIN_ORIGINAL_DROP * 100).toFixed(0)}% vs precio tachado\n`
  );

  const products = await getProductsWithLatestPrice();
  console.log(`Analizando ${products.length} productos...`);

  let deals = 0;
  for (const p of products) {
    const minHist = await getMinPrice(p.id);
    const windowPrices = await getPriceWindow(p.id, WINDOW_DAYS);
    const avg30 = windowPrices.length ? windowPrices.reduce((a, b) => a + b, 0) / windowPrices.length : null;

    const discountVsAvg = avg30 ? (avg30 - p.price) / avg30 : 0;
    const discountVsOriginal =
      p.original_price !== null && p.original_price > 0 ? (p.original_price - p.price) / p.original_price : 0;

    const dealByAvg = avg30 !== null && discountVsAvg >= DEAL_MIN_PRICE_DROP;
    const dealByOriginal = discountVsOriginal >= DEAL_MIN_ORIGINAL_DROP;
    const isDeal = dealByAvg || dealByOriginal;

    await expireProductDeals(p.id);

    if (!isDeal) continue;

    const med = median(windowPrices);
    const distanceToMin = minHist !== null ? (p.price - minHist) / minHist : -1;
    const scorePct = Math.max(discountVsAvg, discountVsOriginal);
    const dealScore = round2(Math.max(0, scorePct) * 70 + Math.max(0, -distanceToMin) * 30);
    const trigger = dealByOriginal && !dealByAvg ? 'vs tachado' : 'vs avg30';
    const discountPct = round2(scorePct * 100);
    const avgDisplay = avg30 !== null ? round2(avg30) : null;

    await insertDeal({
      productId: p.id,
      price: p.price,
      minHistorical: minHist,
      avg30d: avgDisplay,
      discountPct,
      dealScore,
    });
    deals++;

    console.log(
      `  🔥 ${p.sku.padEnd(10)} $${p.price.toLocaleString('es-CO')} (${trigger}) | avg30 $${(avgDisplay ?? 0).toLocaleString('es-CO')} | original $${(p.original_price ?? 0).toLocaleString('es-CO')} | min $${(minHist ?? 0).toLocaleString('es-CO')} | -${discountPct}% | score ${dealScore}`
    );
  }

  const [pc, ph] = await Promise.all([getProductCount(), getPriceHistoryCount()]);
  console.log('\n=== RESUMEN ===');
  console.log(`Ofertas detectadas        : ${deals}`);
  console.log(`Productos en BD           : ${pc}`);
  console.log(`Registros price_history   : ${ph}`);
  console.log(`Tiempo total              : ${((Date.now() - start) / 1000).toFixed(1)}s`);

  await closePool();
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await closePool();
  process.exit(1);
});