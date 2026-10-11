/**
 * Brand & theme verification.
 *
 * Loads the running storefront in the local Google Chrome and asserts that the
 * design tokens (#185ADB / #FF8A3D / #F5F1E8), the brand logo, the brand banner
 * and the mobile header all render as expected.
 *
 * Usage: node scripts/check-brand.mjs   (with the web app running on :3000)
 */
import puppeteer from 'puppeteer-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const EXPECTED = {
  brand600: '#185adb',
  accent500: '#ff8a3d',
  cream100: '#f5f1e8',
  bodyBg: 'rgb(245, 241, 232)', // #F5F1E8
  logoSrc: '/brand/logo.png',
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const failures = [];
const check = (label, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 700));

  const desktop = await page.evaluate(() => {
    const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const bg = (el) => (el ? getComputedStyle(el).backgroundColor : '');
    const links = [...document.querySelectorAll('a,button')];
    const cta = links.find((b) => /Shop All Products/i.test(b.textContent ?? ''));
    const logo = document.querySelector('header img');
    const banner = [...document.querySelectorAll('img')].find((i) => i.src.includes('brand-banner'));
    return {
      tokens: {
        brand600: cssVar('--color-brand-600'),
        accent500: cssVar('--color-accent-500'),
        cream100: cssVar('--color-cream-100'),
      },
      bodyBg: bg(document.body),
      ctaBg: bg(cta),
      logo: logo
        ? { src: logo.getAttribute('src'), natural: logo.naturalWidth, height: Math.round(logo.getBoundingClientRect().height) }
        : null,
      banner: banner ? { loaded: banner.complete && banner.naturalWidth > 0 } : null,
    };
  });

  check('design token --color-brand-600 is #185ADB', desktop.tokens.brand600.toLowerCase() === EXPECTED.brand600, desktop.tokens.brand600);
  check('design token --color-accent-500 is #FF8A3D', desktop.tokens.accent500.toLowerCase() === EXPECTED.accent500, desktop.tokens.accent500);
  check('design token --color-cream-100 is #F5F1E8', desktop.tokens.cream100.toLowerCase() === EXPECTED.cream100, desktop.tokens.cream100);
  check('page background uses the cream surface', desktop.bodyBg === EXPECTED.bodyBg, desktop.bodyBg);
  check('primary CTA uses accent orange (#FF8A3D)', desktop.ctaBg === 'rgb(255, 138, 61)', desktop.ctaBg);
  check('brand logo renders in the header', Boolean(desktop.logo && desktop.logo.natural > 0), JSON.stringify(desktop.logo));
  check('brand banner image loads in the hero', Boolean(desktop.banner?.loaded));

  // Mobile header behaviour
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 500));
  const mobile = await page.evaluate(() => {
    const header = document.querySelector('header');
    const logo = header?.querySelector('img');
    const burger = header?.querySelector('button[aria-label="Menu"]');
    // The desktop search form is display:none on mobile — look for ANY visible input
    const visibleInput = [...header.querySelectorAll('input')].find((i) => i.offsetParent !== null);
    const categoryNav = header.querySelector('[data-testid="category-nav-desktop"]');
    const desktopNavHidden = Boolean(categoryNav) && categoryNav.offsetParent === null;
    const mobileSearchBlock = header.querySelector('[data-testid="mobile-search"]');
    return {
      logoHeight: logo ? Math.round(logo.getBoundingClientRect().height) : 0,
      burgerVisible: Boolean(burger && burger.offsetParent !== null),
      searchVisible: Boolean(visibleInput),
      searchHeight: visibleInput ? Math.round(visibleInput.getBoundingClientRect().height) : 0,
      desktopNavHidden,
      mobileSearchBlockVisible: Boolean(mobileSearchBlock && mobileSearchBlock.offsetParent !== null),
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
    };
  });
  check('mobile: logo scales down', mobile.logoHeight > 0 && mobile.logoHeight <= 40, `${mobile.logoHeight}px`);
  check('mobile: search field visible without opening the menu', mobile.searchVisible);
  check('mobile: search input is a usable tap target', mobile.searchHeight >= 34, `${mobile.searchHeight}px`);
  check('mobile: menu button present', mobile.burgerVisible);
  check('mobile: desktop category nav is hidden', mobile.desktopNavHidden);
  check('mobile: mobile search block is the visible one', mobile.mobileSearchBlockVisible);
  check('mobile: header stays compact', mobile.headerHeight > 0 && mobile.headerHeight <= 190, `${mobile.headerHeight}px`);
} finally {
  await browser.close();
}

console.log(`\n${failures.length === 0 ? 'ALL BRAND CHECKS PASSED' : `${failures.length} FAILED: ${failures.join(', ')}`}`);
process.exit(failures.length === 0 ? 0 : 1);
