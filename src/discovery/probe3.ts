import 'dotenv/config';
import { chromium } from 'playwright';
import { join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function main() {
  const url = 'https://www.falabella.com.co/falabella-co/category/cat50623/Electrohogar';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(4500);

  console.log('URL final:', page.url());
  const count = await page
    .$$eval('a[href*="/product/"]', (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).filter((h) => /\/\d+$/.test(h)).length)
    .catch(() => 0);
  console.log('productos en grid:', count);

  console.log('\n=== CONTADOR TOTAL ===');
  const counter = await page
    .evaluate(() => {
      const body = document.body.innerText;
      const m = body.match(/([\d.]{3,})\s*(?:productos|resultados)/i);
      return m ? m[0] : null;
    })
    .catch(() => null);
  console.log('contador:', counter);

  console.log('\n=== POD CARD (estructura interna) ===');
  const pod = await page
    .evaluate(() => {
      const a = document.querySelector('a[class*="pod"]') as HTMLElement | null;
      if (!a) return null;
      const html = a.outerHTML;
      const text = a.innerText;
      const attrs = Array.from(a.attributes).map((at) => `${at.name}="${at.value.slice(0, 60)}"`);
      return { text: text.replace(/\s+/g, ' ').slice(0, 300), attrs: attrs.slice(0, 12), html: html.slice(0, 2200) };
    })
    .catch(() => null);
  console.log('text:', pod?.text);
  console.log('attrs:', pod?.attrs);

  console.log('\n=== PAGINACION ===');
  const pag = await page
    .evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).filter((a) => /[?&]page=\d+/.test(a.href));
      return Array.from(new Set(links.map((a) => a.href))).slice(0, 8);
    })
    .catch(() => []);
  console.log('links ?page=N:', pag);

  const pagControls = await page
    .evaluate(() => {
      const sel = '[class*="pagination"], [aria-label*="ágina"], [class*="Pagination"], [data-testid*="next"], a[rel="next"]';
      const els = Array.from(document.querySelectorAll(sel)).slice(0, 10);
      return els.map((e) => ({
        tag: e.tagName,
        class: (e.className || '').toString().slice(0, 70),
        text: (e as HTMLElement).innerText.trim().replace(/\s+/g, ' ').slice(0, 40),
      }));
    })
    .catch(() => []);
  pagControls.forEach((c) => console.log(JSON.stringify(c)));

  mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(join(process.cwd(), 'tmp', 'listing_cat50623.html'), await page.content());
  console.log('\nHTML guardado.');

  console.log('\n=== PROBAR ?page=2 ===');
  const p2 = new URL(url);
  p2.searchParams.set('page', '2');
  await page.goto(p2.toString(), { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  const url2 = page.url();
  const count2 = await page
    .$$eval('a[href*="/product/"]', (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).filter((h) => /\/\d+$/.test(h)).length)
    .catch(() => 0);
  console.log('URL p2:', url2, '| productos:', count2);

  await browser.close();
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});