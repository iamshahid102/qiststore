/**
 * Curated catalog importer — real Qist Bazaar products that replace the
 * fictional demo rows which had no photo anywhere in the source catalog.
 *
 * The hand-written demo products (Nova X5, Spark Go 2026, Tab A9, ProBook 450
 * G10, ThinkPad E14 Gen 4, 5KW solar system …) do not exist on the source
 * storefront, so no real photograph can ever be attached to them. Each one is
 * replaced here with a real product from the same category, scraped from its
 * source page so name, advance and description are authentic.
 *
 * Usage: node scripts/import-curated.mjs
 * Output: server/src/seed/curated-products.ts
 * Images are uploaded separately by `npm run sync:images`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = path.join(ROOT, 'server', 'src', 'seed', 'curated-products.ts');

/** Replaces the demo slug listed in `replaces` (see seed.ts REPLACED_BY_ASSETS). */
const CURATED = [
  {
    page: 'oppo-a6c-4gb-64gb',
    displayName: 'OPPO A6c | 4GB-64GB',
    category: 'mobiles',
    brand: null,
    replaces: 'nova-x5-6gb-128gb',
  },
  {
    page: 'vivo-y11d-or-6gb-128-gb',
    displayName: 'Vivo Y11d | 6GB-128GB',
    category: 'mobiles',
    brand: 'vivo',
    replaces: 'nova-x5-lite-4gb-64gb',
  },
  {
    page: 'itel-a100c-or-4gb-64gb',
    displayName: 'Itel A100C | 4GB-64GB',
    category: 'mobiles',
    brand: 'itel',
    replaces: 'spark-go-2026',
  },
  {
    page: 'hp-probook-450-g9-or-i5-12th-generation-or-16gb-256gb-m2-ssd-or-156-screen-81',
    displayName: 'HP ProBook 450 G9 | i5-12th Gen | 16GB | 256GB SSD | 15.6"',
    category: 'laptops',
    brand: 'hp',
    replaces: 'probook-450-g10',
  },
  {
    page: 'lenovo-thinkpad-x280-laptop-intel-core-i5-8th-gen-8gb-ram-256gb-ssd-125-inch-display-190',
    displayName: 'Lenovo ThinkPad X280 | i5-8th Gen | 8GB | 256GB SSD | 12.5"',
    category: 'laptops',
    brand: 'lenovo',
    replaces: 'thinkpad-e14-gen4',
  },
  {
    page: 'samsung-galaxy-tablet-a7-3gb-ram-32gb-rom-10-screen-size-android-11-190',
    displayName: 'Samsung Galaxy Tab A7 | 3GB-32GB | 10"',
    category: 'tablet',
    brand: 'samsung',
    replaces: 'tab-a9',
  },
  {
    page: 'solar-generator-1kw-256',
    displayName: 'Solar Generator 1KW | Complete Package',
    category: 'solar',
    brand: null,
    replaces: '5kw-on-grid-solar-system',
  },
];

const SKU_PREFIX = {
  mobiles: 'MOB',
  laptops: 'LAP',
  'led-tv': 'TV',
  refrigerator: 'REF',
  'washing-machine': 'WM',
  'air-conditioner': 'AC',
  bikes: 'BIK',
  tablet: 'TAB',
  solar: 'SOL',
};

const slugify = (input) =>
  input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const clean = (value) =>
  value
    .replace(/\\r\\n|\\n|\\r/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function flightText(html) {
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let out = '';
  for (const match of html.matchAll(re)) {
    try {
      out += JSON.parse(match[1]);
    } catch {
      // partial chunks are not needed for the fields we read
    }
  }
  return out;
}

/** Parse the customer-facing title into structured specs/highlights. */
function parseDetails(title, category) {
  const specs = [];
  const highlights = [];
  const push = (key, value) => {
    if (value == null || value === '' || specs.some((s) => s.key === key)) return;
    specs.push({ key, value: String(value) });
  };

  if (category === 'mobiles') {
    const storage = title.match(/(\d+)\s*GB\s*[-/ ]\s*(\d+)\s*GB/i);
    if (storage) {
      push('RAM', `${storage[1]}GB`);
      push('Storage', `${storage[2]}GB`);
      highlights.push(`${storage[1]}GB RAM + ${storage[2]}GB storage`);
    }
    highlights.push('Official brand warranty', 'Dual SIM · 4G');
  } else if (category === 'laptops') {
    const gbValues = [...title.matchAll(/(\d+)\s*GB/gi)].map((m) => m[1]);
    const ramGb = title.match(/(\d+)\s*GB\s*RAM/i)?.[1] ?? gbValues[0];
    const ssdGb =
      title.match(/(\d+)\s*GB\s*(?:NVMe\s*)?(?:M\.?2\s*)?SSD/i)?.[1] ??
      gbValues.find((value) => value !== ramGb);
    const screen = title.match(/(\d+(?:\.\d+)?)\s*(?:''|'|"|inch\b)/i);
    const cpuFamily = title.match(/i([357])\s*-?\s*(\d{3,5}[A-Z]?)/i);
    const cpuGen = title.match(/(\d+)(?:th|st|nd|rd)\s*(?:gen|generation)/i);
    if (cpuFamily) push('Processor', `Core i${cpuFamily[1]}${cpuFamily[2] ? ` ${cpuFamily[2]}` : ''}`);
    if (cpuGen) push('Generation', `${cpuGen[1]}th Gen`);
    if (ramGb) push('RAM', `${ramGb}GB`);
    if (ssdGb) push('Storage', `${ssdGb}GB SSD`);
    if (screen) push('Display', `${screen[1]}"`);
    if (ramGb) highlights.push(`${ramGb}GB RAM`);
    if (ssdGb) highlights.push(`${ssdGb}GB SSD storage`);
    if (screen) highlights.push(`${screen[1]}" display`);
    highlights.push('Business-grade build · Wi-Fi + Bluetooth');
  } else if (category === 'tablet') {
    const pair = title.match(/(\d+)\s*GB\s*-\s*(\d+)\s*GB/i);
    const ram = title.match(/(\d+)\s*GB\s*RAM/i)?.[1] ?? pair?.[1];
    const rom = title.match(/(\d+)\s*GB\s*(?:ROM|Storage|Rom)/i)?.[1] ?? pair?.[2];
    const screen = title.match(/(\d+(?:\.\d+)?)\s*(?:''|'|"|inch\b)/i);
    if (ram) push('RAM', `${ram}GB`);
    if (rom) push('Storage', `${rom}GB`);
    if (screen) push('Display', `${screen[1]}"`);
    if (ram) highlights.push(`${ram}GB RAM`);
    if (rom) highlights.push(`${rom}GB storage`);
    if (screen) highlights.push(`${screen[1]}" display`);
    highlights.push('Wi-Fi + Bluetooth', 'Long battery life');
  } else if (category === 'solar') {
    const kw = title.match(/(\d+(?:\.\d+)?)\s*kw/i)?.[1];
    if (kw) {
      push('Capacity', `${kw} KW`);
      highlights.push(`${kw} KW output`);
    }
    highlights.push('Complete package', 'Installation guidance included');
  }

  if (highlights.length < 3) highlights.push('Low advance · flexible installments', 'Free delivery nationwide');
  return { specs, highlights: [...new Set(highlights)].slice(0, 4) };
}

function describe(name, category, details, advanceRs, sourceText) {
  const lead = {
    mobiles: 'A reliable everyday smartphone that covers calls, social media, streaming and photography without stretching your monthly budget.',
    laptops: 'A dependable laptop for work, study and everyday multitasking, with enough memory and fast storage for daily tasks.',
    tablet: 'A portable tablet for streaming, reading and light work, with a bright display and all-day battery life.',
    solar: 'A ready-to-use solar power package that keeps your home running through load-shedding with low monthly running costs.',
  }[category];

  const specLine = details.specs.length
    ? ` Key specs: ${details.specs.map((s) => `${s.key} ${s.value}`).join(' · ')}.`
    : '';

  return `${name} — ${lead}${specLine} ${sourceText} Available at Qist Store with a low advance of Rs ${advanceRs.toLocaleString('en-PK')} on easy monthly installments, with company warranty, free delivery nationwide and simple CNIC-based verification.`
    .replace(/\s+/g, ' ')
    .trim();
}

for (const item of CURATED) {
  const url = `https://www.qistbazaar.pk/product/${item.page}`;
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const text = flightText(html);
  const anchor = text.indexOf('"shortDescription"');
  if (anchor < 0) throw new Error(`No product payload on ${url}`);
  const chunk = text.slice(Math.max(0, anchor - 3500), anchor + 3500);

  const grab = (re) => chunk.match(re)?.[1];
  item.productID = Number(grab(/"productID":(\d+)/));
  item.rawTitle = clean(grab(/"title":"((?:[^"\\]|\\.)*)"/) ?? '');
  item.advanceRs = Number(grab(/"DisplayAmount":(\d+)/));
  item.image = grab(/"productImage":"((?:[^"\\]|\\.)*)"/) ?? '';
  item.sourceText = clean(grab(/"shortDescription":"((?:[^"\\]|\\.)*)"/) ?? '');
  item.slug = grab(/"slug":"((?:[^"\\]|\\.)*)"/) ?? item.page;

  if (!item.productID || !item.rawTitle || !item.advanceRs) {
    throw new Error(`Incomplete product payload on ${url}`);
  }
  if (!item.image || item.image.includes('default-product-thumbnail')) {
    throw new Error(`Source has no real photo for ${url}`);
  }
  console.log(`✓ ${item.productID} ${item.rawTitle} (Rs ${item.advanceRs})`);
}

const products = CURATED.map((item, index) => {
  const name = item.displayName ?? item.rawTitle.replace(/\s*[|-]\s*$/, '').trim();
  const details = parseDetails(name, item.category);
  const cashPriceRs = Math.round(item.advanceRs * 4);

  return {
    sourceId: item.productID,
    replaces: item.replaces,
    sourcePage: `https://www.qistbazaar.pk/product/${item.slug}`,
    name,
    slug: `${slugify(name)}-${item.productID}`,
    sku: `${SKU_PREFIX[item.category]}-AS-${item.productID}`,
    categorySlug: item.category,
    brandSlug: item.brand,
    cashPriceRs,
    description: describe(name, item.category, details, item.advanceRs, item.sourceText),
    highlights: details.highlights,
    specs: details.specs,
    tags: index === 0 || index === 3 ? ['deal-of-day'] : index === 1 ? ['special-offer'] : [],
    images: [],
  };
});

const banner = `/**
 * AUTO-GENERATED FILE — do not edit by hand.
 * Generated by scripts/import-curated.mjs.
 *
 * Real catalog products that replace the fictional demo rows which have no
 * photograph on the source storefront. Images are attached by
 * \`npm run sync:images\` (see product-images.ts).
 */

export interface CuratedProduct {
  /** Original source product id (traceability). */
  sourceId: number;
  /** Demo slug this product replaces in the seed catalogue. */
  replaces: string;
  sourcePage: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  brandSlug: string | null;
  /** Cash price in RUPEES (converted to paisa at seed time). */
  cashPriceRs: number;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  tags: ('deal-of-day' | 'special-offer' | 'instant-delivery' | 'featured')[];
  images: { url: string; alt: string; sort: number }[];
}
`;

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${banner}\nexport const curatedProducts: CuratedProduct[] = ${JSON.stringify(products, null, 2)};\n`, 'utf8');

console.log(`\nCurated catalog written: ${path.relative(ROOT, OUTPUT_FILE)} (${products.length} products)`);
