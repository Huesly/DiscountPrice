import 'dotenv/config';
import { chromium } from 'playwright';
import { exitoAdapter } from '../stores/exito.js';

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

  await page.goto('https://www.exito.com/s/?q=lavadora', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  const cookieBtn = page.locator('[data-fs-cookies-modal-button]');
  if (await cookieBtn.count()) {
    await cookieBtn.first().click();
    await sleep(5000);
  }

  const products = await exitoAdapter.extractListing(page);
  console.log(`Extract: ${products.length} productos`);
  console.log(JSON.stringify(products.slice(0, 3), null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});