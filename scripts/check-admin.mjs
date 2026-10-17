/**
 * Admin dashboard browser smoke test.
 *
 * Logs in with the seeded admin account, walks every dashboard page, asserts
 * the key content rendered, captures screenshots and fails on console errors.
 *
 * Usage: npm run check:admin   (requires web :3000 and API :5000)
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PHONE = process.env.ADMIN_PHONE ?? '03000000001';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';
const OUT_DIR = 'preview';

fs.mkdirSync(OUT_DIR, { recursive: true });

async function firstProductSlug() {
  const login = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, password: PASSWORD }),
  }).then((r) => r.json());
  const res = await fetch(`${API_URL}/admin/products?limit=1`, {
    headers: { Authorization: `Bearer ${login.data.accessToken}` },
  }).then((r) => r.json());
  return res.data?.[0]?.slug ?? null;
}

const slug = await firstProductSlug();
const ROUTES = [
  { path: '/admin', label: 'Dashboard', expect: 'Advance collected', shot: 'admin-dashboard.png' },
  { path: '/admin/products', label: 'Products', expect: 'Catalogue', shot: 'admin-products.png' },
  { path: '/admin/products/new', label: 'Add product', expect: 'Basic information', shot: 'admin-product-new.png' },
  ...(slug
    ? [{ path: `/admin/products/${slug}`, label: 'Edit product', expect: 'Pricing & installment plans', shot: 'admin-product-edit.png' }]
    : []),
  { path: '/admin/orders', label: 'Orders', expect: 'All orders', shot: 'admin-orders.png' },
  { path: '/admin/customers', label: 'Customers', expect: 'Customers', shot: 'admin-customers.png' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const errors = [];
let failures = 0;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!/favicon|Download the React DevTools|Failed to load resource: the server responded with a status of 404/i.test(text)) {
        errors.push(text);
      }
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  // --- Login -----------------------------------------------------------------
  await page.goto(`${BASE_URL}/account/login?next=/admin`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.type('input[placeholder="03XX-XXXXXXX"]', PHONE);
  await page.type('input[type="password"]', PASSWORD);
  await Promise.all([
    page.$eval('input[type="password"]', (el) =>
      el.closest('form').querySelector('button[type="submit"]').click(),
    ),
    page.waitForFunction(() => window.location.pathname.startsWith('/admin'), { timeout: 30000 }),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log(`OK   login redirected to ${new URL(page.url()).pathname}`);

  // --- Pages -----------------------------------------------------------------
  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 900));

    const body = await page.evaluate(() => document.body.innerText);
    const denied = /Access denied|Admin sign in required/i.test(body);
    const found = body.toLowerCase().includes(route.expect.toLowerCase());
    const ok = found && !denied;
    if (!ok) failures++;

    console.log(`${ok ? 'OK  ' : 'FAIL'} ${route.label.padEnd(16)} ${route.path}`);
    if (!found) console.log(`      missing text: ${route.expect}`);
    if (denied) console.log('      blocked by the role gate');

    await page.screenshot({ path: `${OUT_DIR}/${route.shot}`, fullPage: false });

    // Deep-dive on the first order row.
    if (route.label === 'Orders' && ok) {
      const href = await page.$$eval('a[href^="/admin/orders/"]', (links) => links[0]?.getAttribute('href') ?? null);
      if (href) {
        await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const detail = await page.evaluate(() => document.body.innerText);
        const detailOk = /installment schedule/i.test(detail) && /order workflow/i.test(detail);
        if (!detailOk) failures++;
        console.log(`${detailOk ? 'OK  ' : 'FAIL'} Order detail     ${href}`);
        await page.screenshot({ path: `${OUT_DIR}/admin-order-detail.png`, fullPage: false });
      }
    }

    if (route.label === 'Customers' && ok) {
      const href = await page.$$eval('a[href^="/admin/customers/"]', (links) => links[0]?.getAttribute('href') ?? null);
      if (href) {
        await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise((resolve) => setTimeout(resolve, 800));
        const detail = await page.evaluate(() => document.body.innerText);
        const detailOk = /lifetime advance/i.test(detail) && /order history/i.test(detail);
        if (!detailOk) failures++;
        console.log(`${detailOk ? 'OK  ' : 'FAIL'} Customer detail  ${href}`);
        await page.screenshot({ path: `${OUT_DIR}/admin-customer-detail.png`, fullPage: false });
      }
    }
  }

  // --- Mobile shell ----------------------------------------------------------
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 800));
  const mobile = await page.evaluate(() => ({
    hasMenu: Boolean(document.querySelector('[aria-label="Open admin menu"]')),
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
  }));
  if (!mobile.hasMenu || !mobile.overflow) failures++;
  console.log(`${mobile.hasMenu && mobile.overflow ? 'OK  ' : 'FAIL'} Mobile shell     menu=${mobile.hasMenu} no-horizontal-overflow=${mobile.overflow}`);
  await page.screenshot({ path: `${OUT_DIR}/admin-mobile.png`, fullPage: false });

  // --- Storefront still intact ----------------------------------------------
  await page.setViewport({ width: 1440, height: 960 });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 60000 });
  const store = await page.evaluate(() => document.body.innerText);
  const storeOk = /Deals of the Day|Shop by Category|Qist Store/i.test(store) && !/Admin sign in required/.test(store);
  if (!storeOk) failures++;
  console.log(`${storeOk ? 'OK  ' : 'FAIL'} Storefront        /`);
} finally {
  await browser.close();
}

if (errors.length) {
  console.log(`\nconsole errors (${errors.length}):`);
  for (const error of errors.slice(0, 15)) console.log(`  - ${error.slice(0, 200)}`);
  failures += errors.length;
}

console.log(`\nadmin checks failed: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
