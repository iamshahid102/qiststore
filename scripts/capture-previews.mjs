/**
 * Capture UI previews of the running storefront.
 *
 * Saves desktop (1440px) and mobile (390px) screenshots of the home page and
 * the product page so the design can be reviewed without a browser session.
 *
 * Usage: node scripts/capture-previews.mjs   (with the web app on :3000)
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.env.OUT_DIR ?? 'preview';

const SHOTS = [
  { name: 'home-desktop', route: '/', width: 1440, height: 1200, full: true },
  { name: 'home-mobile', route: '/', width: 390, height: 844, full: true, mobile: true },
  { name: 'product-desktop', route: '/product/nova-x5-6gb-128gb', width: 1440, height: 1200, full: true },
];

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: shot.width, height: shot.height, isMobile: Boolean(shot.mobile) });
    await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 600));
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file, fullPage: shot.full });
    console.log(`saved  ${file}`);
    await page.close();
  }
} finally {
  await browser.close();
}
