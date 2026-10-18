import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'https://qiststore.vercel.app';
const ROUTES = process.argv.slice(3);
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  for (const route of ROUTES.length ? ROUTES : ['/']) {
    const page = await browser.newPage();
    const bad = [];
    page.on('response', (r) => {
      if (r.status() >= 400) bad.push(`${r.status()} ${r.request().resourceType()} ${r.url().slice(0, 150)}`);
    });
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 45000 }).catch((e) => bad.push(`nav: ${e.message}`));
    await new Promise((r) => setTimeout(r, 500));
    const uniq = [...new Set(bad)];
    console.log(`\n== ${route} — ${uniq.length} failing request(s)`);
    uniq.slice(0, 15).forEach((x) => console.log('   ', x));
    await page.close();
  }
} finally {
  await browser.close();
}
