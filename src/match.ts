import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getGroupableProducts,
  createGroup,
  clearGroups,
  closePool,
  type GroupableProduct,
} from './db/repo.js';
import { productScore, normalizeName } from './matcher/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Overrides {
  siempreUnir?: [string, string][];
  nuncaUnir?: [string, string][];
}

function loadOverrides(): Overrides {
  try {
    const path = join(__dirname, '..', 'match-overrides.json');
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

const AUTO_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 0.85);
const REVIEW_THRESHOLD = Number(process.env.MATCH_REVIEW_THRESHOLD ?? 0.6);

function keyOf(p: GroupableProduct): string {
  return `${p.store}:${p.sku}`;
}

export async function runMatcher(closeDbOnEnd = false): Promise<{ groups: number; paired: number; review: number }> {
  const start = Date.now();
  const overrides = loadOverrides();
  const productos = await getGroupableProducts();

  console.log(`\n=== MATCHER MULTI-TIENDA ===`);
  console.log(`Productos: ${productos.length} | Umbral auto: ${AUTO_THRESHOLD} | Revisión: ${REVIEW_THRESHOLD}`);

  await clearGroups();

  const byBrand = new Map<string, GroupableProduct[]>();
  for (const p of productos) {
    if (!p.brand) continue;
    const list = byBrand.get(p.brand.toLowerCase()) ?? [];
    list.push(p);
    byBrand.set(p.brand.toLowerCase(), list);
  }

  const siempre = new Set(overrides.siempreUnir?.map(([a, b]) => `${a}|${b}`) ?? []);
  const nunca = new Set(overrides.nuncaUnir?.map(([a, b]) => `${a}|${b}`) ?? []);

  const visited = new Set<string>();
  let groups = 0;
  let paired = 0;
  let review = 0;

  for (const [, brandProducts] of byBrand) {
    for (let i = 0; i < brandProducts.length; i++) {
      const a = brandProducts[i];
      const ka = keyOf(a);
      if (visited.has(ka)) continue;

      const members: GroupableProduct[] = [a];
      visited.add(ka);

      for (let j = i + 1; j < brandProducts.length; j++) {
        const b = brandProducts[j];
        const kb = keyOf(b);
        if (visited.has(kb)) continue;
        if (a.store === b.store) continue;

        const forced =
          siempre.has(`${ka}|${kb}`) || siempre.has(`${kb}|${ka}`);
        const blocked = nunca.has(`${ka}|${kb}`) || nunca.has(`${kb}|${ka}`);
        if (blocked) continue;

        const score = forced ? 1 : productScore(a.name, b.name);

        if (forced || score >= AUTO_THRESHOLD) {
          members.push(b);
          visited.add(kb);
          paired++;
        } else if (score >= REVIEW_THRESHOLD) {
          review++;
        }
      }

      if (members.length > 1) {
        const best = members.slice().sort((x, y) => (x.price ?? Infinity) - (y.price ?? Infinity))[0];
        const name = best?.name ?? a.name;
        const brand = a.brand;
        await createGroup(normalizeName(name).slice(0, 300), brand, members.map((m) => m.id));
        groups++;
      }
    }
  }

  console.log('\n=== RESUMEN ===');
  console.log(`Grupos creados        : ${groups}`);
  console.log(`Parejas unidas        : ${paired}`);
  console.log(`Parejas en revisión   : ${review}`);
  console.log(`Tiempo                : ${((Date.now() - start) / 1000).toFixed(1)}s`);

  if (closeDbOnEnd) {
    await closePool();
  }

  return { groups, paired, review };
}

if (process.argv[1]?.endsWith('match.ts')) {
  runMatcher(true).catch(async (e) => {
    console.error('ERROR:', e);
    await closePool();
    process.exit(1);
  });
}