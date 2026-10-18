/**
 * Live deployment smoke test.
 *
 *   # web + api on one domain (single project with Vercel services)
 *   node scripts/verify-live.mjs https://qiststore.vercel.app
 *
 *   # split projects: web domain + api domain
 *   node scripts/verify-live.mjs https://qiststore-web.vercel.app https://qiststore-api.vercel.app
 *
 * Checks the web app (Next.js) and the API (Express) end to end: public pages
 * render, the API routes answer, auth guards reject anonymous and bad requests,
 * and SEO routes exist. `/health` is checked on the API host when one is given,
 * otherwise on the web host (same-origin setup).
 * Exits non-zero if any check fails.
 */
const BASE = (process.argv[2] || 'https://qiststore.vercel.app').replace(/\/$/, '');
const API_BASE = (process.argv[3] || BASE).replace(/\/$/, '');
const ADMIN = { phone: '03000000001', password: 'Admin@123' };

let failures = 0;
const record = (ok, label, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
};

const get = async (path, init, base = BASE) => {
  const res = await fetch(`${base}${path}`, { redirect: 'manual', ...init });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
};

const expectStatus = async (path, expected, label = path, init, base = BASE) => {
  try {
    const { status, text } = await get(path, init, base);
    record(status === expected, `${label} → ${expected}`, `got ${status}${status !== expected ? ` ${text.slice(0, 120)}` : ''}`);
    return { status, text };
  } catch (err) {
    record(false, `${label} → ${expected}`, `request failed: ${err.message}`);
    return { status: 0, text: '' };
  }
};

const main = async () => {
  console.log(`Verifying ${BASE}\n`);

  // --- api service -----------------------------------------------------------
  const health = await expectStatus(
    '/health',
    200,
    `GET ${API_BASE}/health (api service)`,
    undefined,
    API_BASE,
  );
  if (health.status === 200) {
    const body = JSON.parse(health.text);
    record(body.data?.db === 'connected', 'health reports db=connected', JSON.stringify(body.data));
  }

  const products = await expectStatus('/api/v1/products?limit=2', 200, 'GET /api/v1/products');
  let slug = null;
  let categorySlug = null;
  if (products.status === 200) {
    const body = JSON.parse(products.text);
    const items = body.data ?? [];
    record(Array.isArray(items) && items.length > 0, 'products payload has items', `total=${body.meta?.total}`);
    slug = items[0]?.slug ?? null;
  }
  const tree = await expectStatus('/api/v1/categories/tree', 200, 'GET /api/v1/categories/tree');
  if (tree.status === 200) {
    categorySlug = JSON.parse(tree.text).data?.[0]?.slug ?? null;
  }

  await expectStatus('/api/v1/admin/stats', 401, 'admin stats without token is rejected');
  await expectStatus('/api/v1/auth/login', 400, 'POST /auth/login with bad payload is rejected', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: 'x' }),
  });
  await expectStatus('/api/v1/does-not-exist', 404, 'unknown api route is 404');

  // --- web service ----------------------------------------------------------
  for (const path of ['/', '/shop', '/search?q=laptop', '/cart', '/checkout', '/blogs', '/stores', '/admin', '/page/verification-process']) {
    await expectStatus(path, 200, `page ${path}`, undefined);
  }
  if (slug) await expectStatus(`/product/${slug}`, 200, `page /product/${slug}`);
  if (categorySlug) {
    await expectStatus(`/product-category/${categorySlug}`, 200, `page /product-category/${categorySlug}`);
  }
  await expectStatus('/sitemap.xml', 200, 'sitemap.xml');
  await expectStatus('/robots.txt', 200, 'robots.txt');

  // --- admin auth end to end -------------------------------------------------
  const login = await expectStatus('/api/v1/auth/login', 200, 'POST /auth/login as admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  if (login.status === 200) {
    const token = JSON.parse(login.text).data?.accessToken;
    record(Boolean(token), 'login returns access token');
    if (token) {
      const stats = await expectStatus('/api/v1/admin/stats', 200, 'GET /admin/stats with token', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stats.status === 200) {
        const body = JSON.parse(stats.text);
        record(Boolean(body.data), 'admin stats payload present', JSON.stringify(body.data).slice(0, 120));
      }
    }
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error('verification crashed:', err);
  process.exit(1);
});
