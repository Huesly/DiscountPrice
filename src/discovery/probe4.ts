import 'dotenv/config';
import { chromium } from 'playwright';
import { POD_SELECTOR, USER_AGENT } from '../config.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function countPods(url: string): Promise<{ count: number; distinct: number }> {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  await page.waitForSelector(POD_SELECTOR, { timeout: 20000 }).catch(() => {});
  const count = await page.locator(POD_SELECTOR).count();
  const distinct = await page
    .locator(POD_SELECTOR)
    .evaluateAll((els) => Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('data-key')))).filter(Boolean).length)
    .catch(() => 0);
  console.log(`  ${url}\n    pods: ${count} | distinct data-key: ${distinct}`);
  await browser.close();
  return { count, distinct };
}

async function main() {
  console.log('--- Paginado de búsqueda Falabella ---');
  await countPods('https://www.falabella.com.co/falabella-co/search/?Ntt=aspiradora&page=1');
  await countPods('https://www.falabella.com.co/falabella-co/search/?Ntt=aspiradora&page=2');
  await countPods('https://www.falabella.com.co/falabella-co/search?Ntt=aspiradora&page=2');
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});