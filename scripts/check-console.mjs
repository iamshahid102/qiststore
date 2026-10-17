/**
 * Console / runtime error check.
 *
 * Loads the key routes in the local Chrome and fails if the browser console
 * reports any error/warning, if a page throws, if a real network request fails
 * or if any response is a 5xx.
 *
 * Next.js RSC prefetches that are cancelled when the headless page closes
 * (`?_rsc=...` + net::ERR_ABORTED) are benign and ignored — every other
 * failure is reported.
 *
 * Usage: node scripts/check-console.mjs   (with the web app running on :3000)
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ROUTES = [
  '/',
  '/shop',
  '/product/oppo-a6c-4gb-64gb-12172',
  '/product-category/mobiles',
  '/cart',
  '/checkout',
  '/order-tracking',
  '/account/login',
  '/account/register',
  '/wishlist',
  '/page/faqs',
  '/stores',
  '/visit-us',
  '/blogs',
];

const isBenign = (url, errorText) =>
  (url.includes('_rsc=') && /ERR_ABORTED/.test(errorText)) || /favicon/.test(url);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let problems = 0;
let benignAborts = 0;

try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const issues = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        issues.push(`console.${m.type()}: ${m.text().slice(0, 160)}`);
      }
    });
    page.on('pageerror', (e) => issues.push(`pageerror: ${String(e.message).slice(0, 160)}`));
    page.on('requestfailed', (r) => {
      const text = r.failure()?.errorText ?? '';
      if (isBenign(r.url(), text)) {
        benignAborts++;
        return;
      }
      issues.push(`request failed: ${r.url().slice(0, 90)} ${text}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 500) issues.push(`http ${r.status()}: ${r.url().slice(0, 90)}`);
    });

    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      issues.push(`navigation: ${String(err.message).slice(0, 100)}`);
    }

    problems += issues.length;
    console.log(
      issues.length === 0
        ? `CLEAN  ${route}`
        : `ISSUES ${route}\n        ${issues.slice(0, 6).join('\n        ')}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\nbenign RSC prefetch aborts (ignored): ${benignAborts}`);
console.log(`real console/page/network problems: ${problems}`);
process.exit(problems === 0 ? 0 : 1);
