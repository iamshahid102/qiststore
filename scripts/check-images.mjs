/**
 * Product image check — verifies images actually render in a real browser.
 *
 * Loads the storefront in the locally installed Chrome and asserts that every
 * product <img> (Cloudinary URL behind the Next.js optimizer) has decoded
 * pixels (naturalWidth > 0). Fails if a product image is missing or broken.
 *
 * Usage: npm run check:images   (with the web app running on :3000)
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/shop', label: 'Shop' },
  { path: '/product-category/mobiles', label: 'Mobiles category' },
  { path: '/product/infinix-hot-60i-6gb-128gb-5549', label: 'Product detail' },
  { path: '/product/oppo-a6c-4gb-64gb-12172', label: 'Curated product detail' },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;

try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      if (/cloudinary|_next\/image/.test(request.url())) {
        failedRequests.push(`${request.url().slice(0, 110)} ${request.failure()?.errorText ?? ''}`);
      }
    });

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0', timeout: 60000 });

    // Trigger lazy loading in steps, then wait until every product image has
    // actually decoded (not just started loading).
    await page.evaluate(async () => {
      const step = 500;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      window.scrollTo(0, 0);
    });
    await page
      .waitForFunction(
        () => {
          const images = [...document.querySelectorAll('img')].filter((img) => {
            const src = img.currentSrc || img.src || '';
            return src.includes('res.cloudinary.com') || src.includes('/_next/image?url=');
          });
          return images.length > 0 && images.every((img) => img.complete);
        },
        { timeout: 25000 },
      )
      .catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const result = await page.evaluate(() => {
      const images = [...document.querySelectorAll('img')].filter((img) => {
        const src = img.currentSrc || img.src || '';
        return src.includes('res.cloudinary.com') || src.includes('/_next/image?url=');
      });
      const broken = images
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => (img.currentSrc || img.src).slice(0, 120));
      const pending = images.filter((img) => !img.complete).length;
      return {
        total: images.length,
        loaded: images.filter((img) => img.naturalWidth > 0).length,
        broken,
        pending,
        sample: images.slice(0, 3).map((img) => ({
          width: img.naturalWidth,
          height: img.naturalHeight,
          src: (img.currentSrc || img.src).slice(0, 90),
        })),
      };
    });

    const problems = result.broken.length + failedRequests.length + result.pending;
    if (result.total === 0 || problems > 0) failures++;
    console.log(
      `${problems === 0 ? 'OK  ' : 'FAIL'} ${route.label.padEnd(24)} images=${result.total} loaded=${result.loaded} pending=${result.pending}`,
    );
    for (const broken of result.broken) console.log(`      broken: ${broken}`);
    for (const failed of failedRequests.slice(0, 5)) console.log(`      request failed: ${failed}`);
    if (problems === 0) {
      for (const sample of result.sample) console.log(`      ${sample.width}x${sample.height}  ${sample.src}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\nproduct image failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
