import { chromium } from 'playwright';

const HOMECENTER_BASE = 'https://www.homecenter.com.co';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
    locale: 'es-CO',
  });
  const page = await ctx.newPage();

  const url = `${HOMECENTER_BASE}/homecenter-co/search?Ntt=lavadora`;
  console.log('>> navegando:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('div[data-key]', { timeout: 30000 }).catch(() => console.log('!! sin div[data-key]'));

  const cards = await page.$$eval('div[data-key]', (els) => els.map((el) => el.getAttribute('data-key')));
  console.log('>> cards (data-key):', cards.length, cards.slice(0, 5));

  const firstCard = await page.evaluate(() => {
    const el = document.querySelector('div[data-key]') as HTMLElement | null;
    if (!el) return null;
    const link = el.querySelector('a[href*="/product/"]') as HTMLAnchorElement | null;
    const title = el.querySelector('h2.product-title') as HTMLElement | null;
    const brand = el.querySelector('.product-brand') as HTMLElement | null;
    const priceEl = el.querySelector('.main .parsedPrice') as HTMLElement | null;
    const oldPriceEl = el.querySelector('.sub .parsedPrice.label') as HTMLElement | null;
    const discount = el.querySelector('.discount-badge') as HTMLElement | null;
    const img = el.querySelector('.product-image img') as HTMLImageElement | null;
    return {
      dataKey: el.getAttribute('data-key'),
      href: link?.href ?? null,
      title: title?.textContent?.trim() ?? null,
      brand: brand?.textContent?.trim() ?? null,
      price: priceEl?.textContent?.trim() ?? null,
      oldPrice: oldPriceEl?.textContent?.trim() ?? null,
      discount: discount?.textContent?.trim() ?? null,
      img: img?.src ?? null,
    };
  });
  console.log('>> primera tarjeta (DOM):');
  console.log(JSON.stringify(firstCard, null, 2));

  const nextDataInfo = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return { present: false };
    try {
      const json = JSON.parse(el.textContent || '');
      const stack: { obj: unknown; path: string }[] = [{ obj: json, path: 'root' }];
      const found: { path: string; len: number }[] = [];
      while (stack.length) {
        const { obj, path } = stack.pop()!;
        if (Array.isArray(obj)) {
          if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && Array.isArray((obj[0] as any).prices)) {
            found.push({ path, len: obj.length });
          }
          obj.forEach((it, i) => stack.push({ obj: it, path: `${path}[${i}]` }));
        } else if (obj && typeof obj === 'object') {
          for (const k of Object.keys(obj as Record<string, unknown>)) {
            stack.push({ obj: (obj as Record<string, unknown>)[k], path: `${path}.${k}` });
          }
        }
      }
      return { present: true, found };
    } catch (e) {
      return { present: true, error: String(e) };
    }
  });
  console.log('>> __NEXT_DATA__ paths con prices:');
  console.log(JSON.stringify(nextDataInfo, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
