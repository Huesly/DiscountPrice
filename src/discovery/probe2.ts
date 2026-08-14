import 'dotenv/config';
import { chromium } from 'playwright';
import { join } from 'node:path';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function openListing(url: string, label: string) {
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

  const finalUrl = page.url();
  const productCount = await page
    .$$eval('a[href*="/product/"]', (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).filter((h) => /\/\d+$/.test(h)).length)
    .catch(() => 0);

  console.log(`\n[${label}]`);
  console.log('  URL final   :', finalUrl);
  console.log('  productos   :', productCount);

  if (productCount > 0) {
    const podInfo = await page
      .evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/product/"]'));
        const withId = links.filter((a) => /\/\d+$/.test((a as HTMLAnchorElement).href));
        let el: Element | null | undefined = withId[0];
        const path: string[] = [];
        for (let i = 0; i < 6 && el; i++) {
          const cls = (el.className || '').toString();
          path.push(`${el.tagName}.${cls.slice(0, 80)}`);
          el = el.parentElement;
        }
        return { firstHref: (withId[0] as HTMLAnchorElement).href, path };
      })
      .catch(() => null);
    console.log('  primer link :', podInfo?.firstHref);
    console.log('  ascendentes :');
    podInfo?.path.forEach((p, i) => console.log(`    [${i}] ${p}`));

    const html = await page.content();
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    writeFileSync(join(process.cwd(), 'tmp', `listing_${label.replace(/\W+/g, '_')}.html`), html);
  }

  await browser.close();
}

async function main() {
  await openListing(
    'https://www.falabella.com.co/falabella-co/search/?Ntt=aspiradora',
    'SEARCH aspiradora'
  );
  await openListing(
    'https://www.falabella.com.co/falabella-co/category/cat70057/Hogar',
    'CATEGORY cat70057'
  );
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});