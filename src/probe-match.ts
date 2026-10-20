import 'dotenv/config';
import { getGroupableProducts, closePool } from './db/repo.js';
import { productScore } from './matcher/normalize.js';

async function main() {
  const prods = await getGroupableProducts();
  const exito = prods.filter((p) => p.store === 'exito');
  const falabella = prods.filter((p) => p.store === 'falabella');

  console.log(`Éxito: ${exito.length} | Falabella: ${falabella.length}\n`);

  const byBrand = new Map<string, typeof falabella>();
  for (const f of falabella) {
    if (!f.brand) continue;
    const list = byBrand.get(f.brand.toLowerCase()) ?? [];
    list.push(f);
    byBrand.set(f.brand.toLowerCase(), list);
  }

  let best: { a: string; b: string; score: number }[] = [];
  for (const e of exito) {
    if (!e.brand) continue;
    const fb = byBrand.get(e.brand.toLowerCase());
    if (!fb) continue;
    for (const f of fb) {
      const s = productScore(e.name, f.name);
      if (s >= 0.4) {
        best.push({ a: `${e.store}:${e.sku}`, b: `${f.store}:${f.sku}`, score: s });
      }
    }
  }
  best.sort((x, y) => y.score - x.score);
  console.log('=== PARES ÉXITO-FALABELLA score >= 0.4 ===');
  for (const p of best.slice(0, 40)) {
    const ea = prods.find((x) => `${x.store}:${x.sku}` === p.a);
    const fa = prods.find((x) => `${x.store}:${x.sku}` === p.b);
    console.log(`[${p.score.toFixed(2)}] ${p.a} vs ${p.b}`);
    console.log(`   E: ${ea?.name}`);
    console.log(`   F: ${fa?.name}`);
  }

  console.log(`\nTotal pares >= 0.4: ${best.length}`);
  await closePool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});