/**
 * Responsive smoke check.
 *
 * Uses the locally installed Google Chrome (via puppeteer-core, no browser
 * download) to load every key route at common device widths and assert that
 * nothing forces horizontal scrolling.
 *
 * Usage:
 *   node scripts/check-responsive.mjs                # default base URL :3000
 *   BASE_URL=http://localhost:3000 node scripts/check-responsive.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ROUTES = [
  '/',
  '/shop',
  '/product-category/mobiles',
  '/product/nova-x5-6gb-128gb',
  '/search?q=laptop',
  '/cart',
  '/checkout',
  '/order-tracking',
  '/account/login',
  '/account/register',
  '/wishlist',
  '/page/faqs',
  '/page/verification-process',
  '/blogs',
  '/stores',
  '/visit-us',
];

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440];

const overflowProbe = () => {
  const vw = window.innerWidth;
  const offenders = [];

  const inScrollContainer = (el) => {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const ox = getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      node = node.parentElement;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const spillsRight = r.right > vw + 1;
    const spillsLeft = r.left < -1;
    if ((spillsRight || spillsLeft) && !inScrollContainer(el)) {
      const cls = typeof el.className === 'string' ? el.className.slice(0, 70) : '';
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls,
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
      if (offenders.length >= 5) break;
    }
  }

  return {
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders,
  };
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
let checks = 0;

try {
  for (const route of ROUTES) {
    const results = [];
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 768 });
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await new Promise((r) => setTimeout(r, 350));
        const probe = await page.evaluate(overflowProbe);
        checks++;
        const overflows = probe.scrollWidth > probe.viewport + 1 || probe.offenders.length > 0;
        if (overflows) {
          failures++;
          results.push({ width, ...probe, overflows });
        }
      } catch (err) {
        failures++;
        results.push({ width, error: String(err.message).slice(0, 120) });
      } finally {
        await page.close();
      }
    }
    if (results.length === 0) {
      console.log(`PASS  ${route}  (${WIDTHS.length} widths: ${WIDTHS.join(', ')})`);
    } else {
      console.log(`FAIL  ${route}`);
      for (const r of results) {
        if (r.error) {
          console.log(`        ${r.width}px: ERROR ${r.error}`);
        } else {
          console.log(
            `        ${r.width}px: scrollWidth=${r.scrollWidth} offenders=${JSON.stringify(r.offenders)}`,
          );
        }
      }
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${checks} viewport checks · ${failures} overflow failures`);
process.exit(failures === 0 ? 0 : 1);
