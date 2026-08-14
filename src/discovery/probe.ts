import 'dotenv/config';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.FALABELLA_BASE ?? 'https://www.falabella.com.co';
const CATEGORY = process.env.FALABELLA_CATEGORY ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  await page.goto(CATEGORY, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  await page.waitForSelector('a[href*="/product/"]', { timeout: 20000 }).catch(() => {});

  console.log('=== JSON-LD ===');
  const jsonld = await page.$$eval('script[type="application/ld+json"]', (els) =>
    els.map((e) => e.textContent)
  );
  jsonld.forEach((j, i) => {
    const head = (j ?? '').slice(0, 600);
    console.log(`[${i}] ${head}`);
  });

  console.log('\n=== ESTRUCTURA CARD GRID ===');
  const cards = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
    const withId = links.filter((a) => /\/\d+$/.test((a as HTMLAnchorElement).href));
    const pod = withId[0]?.closest('[class*="pod"], [class*="pod-item"], [class*="podItem"], [data-product-id]');
    const sample: any[] = [];
    for (const [i, a] of withId.slice(0, 3).entries()) {
      let el: Element | null | undefined = a;
      for (let depth = 0; depth < 6 && el; depth++) {
        el = el.parentElement;
        if (!el) break;
        const cls = (el.className || '').toString();
        if (/pod|card-item|itemCard|product/i.test(cls)) {
          sample.push({
            idx: i,
            tag: el.tagName,
            class: cls.slice(0, 120),
            depth,
            attrs: Array.from(el.attributes)
              .filter((at) => /data-|sku|pod/i.test(at.name))
              .slice(0, 6)
              .map((at) => `${at.name}="${at.value.slice(0, 40)}"`)
              .join(' '),
          });
          el = undefined;
          break;
        }
      }
    }
    return sample;
  });
  console.log('Candidatos contenedor card:');
  cards.forEach((c) => console.log(JSON.stringify(c)));

  console.log('\n=== ATTRS DEL LINK / POD ===');
  const podAttrs = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
    const withId = links.filter((a) => /\/\d+$/.test((a as HTMLAnchorElement).href));
    const el = withId[0]?.closest('[class*="pod"]') ?? withId[0]?.parentElement;
    return el ? Array.from(el.attributes).map((a) => `${a.name}="${a.value.slice(0, 80)}"`) : [];
  });
  console.log(podAttrs.slice(0, 20));

  console.log('\n=== GRID CONTAINER ===');
  const grid = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
    const withId = links.filter((a) => /\/\d+$/.test((a as HTMLAnchorElement).href));
    let el = withId[0]?.parentElement;
    const names: string[] = [];
    for (let i = 0; i < 5 && el; i++) {
      names.push(`${el.tagName}.${(el.className || '').toString().slice(0, 60)}`);
      el = el.parentElement;
    }
    return names;
  });
  console.log(grid.join('\n'));

  console.log('\n=== PAGINACION: probar ?page=2 ===');
  const page2 = new URL(CATEGORY);
  page2.searchParams.set('page', '2');
  const r2 = await page.goto(page2.toString(), { waitUntil: 'domcontentloaded' });
  await sleep(3500);
  await page.waitForSelector('a[href*="/product/"]', { timeout: 15000 }).catch(() => {});
  const links2 = await page.$$eval('a[href*="/product/"]', (as) =>
    Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).filter((h) => /\/\d+$/.test(h))
  );
  console.log(`Página 2 -> ${links2.length} productos, status ${r2?.status()}`);
  console.log('Primeros:', links2.slice(0, 3));

  console.log('\n=== !=== NUMERO TOTAL / CONTADOR ===');
  const counters = await page.$$eval('[class*="result"], [class*="resultado"], [class*="count"], b', (els) =>
    els.slice(0, 6).map((e) => (e as HTMLElement).innerText.trim().replace(/\s+/g, ' ').slice(0, 60))
  ).catch(() => []);
  console.log(counters.join(' | '));

  const bodyText = (await page.evaluate(() => document.body.innerText)) ?? '';
  const m = bodyText.match(/(\d[\d.,]{2,})\s*(productos|resultados|artículos)/i);
  console.log('Contador en body:', m ? m[0] : '(no encontrado)');

  const html = await page.content();
  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(join(process.cwd(), 'tmp', 'category.html'), html);
  console.log('\nHTML guardado en tmp/category.html');

  await browser.close();
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});