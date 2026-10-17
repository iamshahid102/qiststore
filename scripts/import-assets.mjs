#!/usr/bin/env node
/**
 * Import the user-provided catalog in `assets/` into the Qist Store project.
 *
 * Source:
 *   assets/data/products.json       grouped dump (13 category keys, 676 rows)
 *   assets/data/products_flat.json  flat dump (676 rows)
 *   assets/images/<category>/*      product images (15 folders, optional —
 *                                   every supplied file was an invalid 404
 *                                   HTML page, so this folder may be deleted)
 *
 * What it does:
 *   1. De-duplicates the scraped rows into real products.
 *   2. Repairs the scraped category (every row was dumped under "led-tv").
 *   3. Normalizes titles, brand, RAM/storage, capacity and specs.
 *   4. Derives a cash price (source only ships the advance amount).
 *   5. Copies every product image into `client/public/products/<category>/`.
 *   6. Writes `server/src/seed/assets-products.ts` (typed, compiled by tsc).
 *
 * Run: node scripts/import-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DATA = path.join(ROOT, 'assets', 'data', 'products_flat.json');
const SOURCE_IMAGES = path.join(ROOT, 'assets', 'images');
const PUBLIC_IMAGES = path.join(ROOT, 'client', 'public', 'products');
const OUTPUT_FILE = path.join(ROOT, 'server', 'src', 'seed', 'assets-products.ts');

const CATEGORY_SLUGS = new Set([
  'mobiles', 'laptops', 'led-tv', 'refrigerator', 'washing-machine',
  'air-conditioner', 'bikes', 'microwave-oven', 'water-dispenser', 'fans',
  'deep-freezer', 'batteries', 'mattress', 'tyres', 'tablet',
]);

const CATEGORY_LABEL = {
  mobiles: 'Mobile Phone',
  laptops: 'Laptop',
  'led-tv': 'LED TV',
  refrigerator: 'Refrigerator',
  'washing-machine': 'Washing Machine',
  'air-conditioner': 'Air Conditioner',
  bikes: 'Motorbike',
};

const SKU_PREFIX = {
  mobiles: 'MOB',
  laptops: 'LAP',
  'led-tv': 'TV',
  refrigerator: 'REF',
  'washing-machine': 'WM',
  'air-conditioner': 'AC',
  bikes: 'BIKE',
};

/** Brand detection is ordered: first match wins (HP before Pel, etc.). */
const BRANDS = [
  { slug: 'infinix', pattern: /\binfinix\b/i, label: 'Infinix' },
  { slug: 'tecno', pattern: /\btecno\b/i, label: 'Tecno' },
  { slug: 'vivo', pattern: /\bvivo\b/i, label: 'Vivo' },
  { slug: 'itel', pattern: /\bitel\b/i, label: 'Itel' },
  { slug: 'samsung', pattern: /\bsamsung\b/i, label: 'Samsung' },
  { slug: 'xiaomi', pattern: /\bxiaomi\b/i, label: 'Xiaomi' },
  { slug: 'hp', pattern: /\bhp\b|\bprobook\b|\bzbook\b/i, label: 'HP' },
  { slug: 'dell', pattern: /\bdell\b|\blatitude\b/i, label: 'Dell' },
  { slug: 'lenovo', pattern: /\blenovo\b|\bthinkpad\b|x1 carbon/i, label: 'Lenovo' },
  { slug: 'dawlance', pattern: /\bdawlance\b/i, label: 'Dawlance' },
  { slug: 'haier', pattern: /\bhaier\b/i, label: 'Haier' },
  { slug: 'pel', pattern: /\bpel\b/i, label: 'Pel' },
  { slug: 'superpower', pattern: /\bsuperpower\b/i, label: 'SuperPower' },
];

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function cleanTitle(raw) {
  return String(raw)
    .replace(/\\+(?=\s*(?:\||$))/g, '"') // scraped escape artifact: `32\` -> `32"`
    .replace(/â€³|â€/g, '"') // mojibake inch marks
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*$/, '')
    .trim();
}

function classify(title) {
  const t = title.toLowerCase();
  if (/laptop|probook|zbook|latitude|thinkpad|elitebook|x1 carbon/.test(t)) return 'laptops';
  if (/motorbike|\bbike\b/.test(t)) return 'bikes';
  if (/air conditioner|split ac|\bton\b/.test(t)) return 'air-conditioner';
  if (/washing machine|washer|twin tub|top load/.test(t)) return 'washing-machine';
  if (/refrigerator|\bcf\b/.test(t)) return 'refrigerator';
  if (/led tv|q led|google tv|\d+(?:\.\d+)?\s*"/.test(t)) return 'led-tv';
  if (/infinix|tecno|vivo|itel|samsung|xiaomi|smart \d|hot \d|spark|city \d|y05|a07|a200/.test(t)) return 'mobiles';
  return null;
}

function detectBrand(title) {
  const found = BRANDS.find((b) => b.pattern.test(title));
  return found ?? null;
}

function num(value) {
  return Number.parseFloat(value);
}

/** Parse the customer-facing title into structured specs/highlights. */
function parseDetails(title, category) {
  const specs = [];
  const highlights = [];
  const push = (key, value) => {
    if (value != null && value !== '' && !specs.some((s) => s.key === key)) specs.push({ key, value: String(value) });
  };

  if (category === 'mobiles') {
    const storage = title.match(/(\d+)\s*GB\s*[- ]\s*(\d+)\s*GB/i);
    if (storage) {
      push('RAM', `${storage[1]}GB`);
      push('Storage', `${storage[2]}GB`);
      highlights.push(`${storage[1]}GB RAM + ${storage[2]}GB storage`);
    }
    highlights.push('Official brand warranty', 'Dual SIM · 4G');
  } else if (category === 'laptops') {
    const gbValues = [...title.matchAll(/(\d+)\s*GB/gi)].map((m) => m[1]);
    const ramGb = title.match(/(\d+)\s*GB\s*RAM/i)?.[1] ?? gbValues[0];
    const ssdGb = title.match(/(\d+)\s*GB\s*(?:NVMe\s*)?SSD/i)?.[1] ?? gbValues[1];
    const screen = title.match(/(\d+(?:\.\d+)?)\s*(?:''|'|"|inch\b)/i);
    const cpuI = title.match(/i([357])\s*-?\s*(\d{3,5}[A-Z]?)?\s*(?:(\d+)(?:th|st|nd|rd|h)\s*(?:gen|generation)?)?/i);
    const cpuGen = title.match(/(\d+)(?:th|st|nd|rd|h)\s*generation/i);
    if (cpuI) {
      const family = `Core i${cpuI[1]}`;
      const model = cpuI[2] ? ` ${cpuI[2]}` : '';
      const gen = cpuI[3] ?? cpuGen?.[1];
      push('Processor', `${family}${model}${!cpuI[2] && gen ? ` (${gen}th Gen)` : ''}`);
    } else if (cpuGen) {
      push('Processor', `${cpuGen[1]}th Gen Intel Core`);
    }
    if (ramGb) push('RAM', `${ramGb}GB`);
    if (ssdGb) push('Storage', `${ssdGb}GB SSD`);
    if (screen) push('Display', `${screen[1]}"`);
    if (ramGb) highlights.push(`${ramGb}GB RAM`);
    if (ssdGb) highlights.push(`${ssdGb}GB NVMe SSD`);
    if (screen) highlights.push(`${screen[1]}" display`);
    highlights.push('Business-grade build · Wi-Fi + Bluetooth');
  } else if (category === 'air-conditioner') {
    const ton = title.match(/(\d+(?:\.\d+)?)\s*ton/i);
    const inverter = /inverter/i.test(title);
    const heatCool = /h&c|heat/i.test(title);
    if (ton) {
      push('Capacity', `${ton[1]} Ton`);
      highlights.push(`${ton[1]} Ton cooling capacity`);
    }
    push('Type', `${inverter ? 'Inverter ' : ''}Split AC`);
    push('Mode', heatCool ? 'Heat & Cool' : 'Cool Only');
    if (inverter) highlights.push('Energy-saving inverter compressor');
    highlights.push('Copper condenser', 'Free delivery + professional installation guidance');
  } else if (category === 'refrigerator') {
    const cf = title.match(/(\d+(?:\.\d+)?)\s*cf/i);
    const inverter = /inverter/i.test(title);
    if (cf) {
      push('Capacity', `${cf[1]} CF`);
      highlights.push(`${cf[1]} cubic feet capacity`);
    }
    push('Type', inverter ? 'Inverter Direct Cool' : 'Direct Cool');
    if (inverter) highlights.push('Inverter compressor');
    highlights.push('Adjustable shelves', '10-year compressor warranty');
  } else if (category === 'washing-machine') {
    const kg = title.match(/(\d+)\s*kg/i);
    if (kg) {
      push('Capacity', `${kg[1]} KG`);
      highlights.push(`${kg[1]} KG wash capacity`);
    }
    if (/twin tub/i.test(title)) push('Type', 'Twin Tub Semi Automatic');
    else if (/top load/i.test(title)) push('Type', 'Top Load Automatic');
    else if (/single tub/i.test(title)) push('Type', 'Single Tub');
    if (/twin tub/i.test(title)) highlights.push('Twin tub — wash & spin together');
    highlights.push('Energy-efficient motor', 'Free delivery across Pakistan');
  } else if (category === 'led-tv') {
    const size = title.match(/(\d+)\s*(?:"|'')/);
    if (size) {
      push('Screen size', `${size[1]}"`);
      highlights.push(`${size[1]}" screen`);
    }
    if (/q led/i.test(title)) push('Panel', 'QLED');
    if (/google tv/i.test(title)) push('Smart platform', 'Google TV');
    highlights.push('Smart TV with built-in apps', 'HDMI + USB connectivity');
  } else if (category === 'bikes') {
    const cc = title.match(/(\d+)\s*cc/i);
    if (cc) {
      push('Engine', `${cc[1]} CC`);
      highlights.push(`${cc[1]} CC engine`);
    }
    highlights.push('Fuel-efficient commuter', 'Electric start');
  }

  if (highlights.length < 3) highlights.push('Low advance · flexible installments', 'Free delivery nationwide');
  return { specs, highlights: [...new Set(highlights)].slice(0, 4) };
}

function describe(name, category, details, advanceRs) {
  const lead = {
    mobiles: 'A reliable everyday smartphone that covers calls, social media, streaming and photography without stretching your monthly budget.',
    laptops: 'A dependable laptop for work, study and everyday multitasking, with enough memory and fast SSD storage for daily tasks.',
    'air-conditioner': 'A comfort-focused split air conditioner built for Pakistani summers, with efficient cooling and a durable copper condenser.',
    refrigerator: 'A family-sized refrigerator with practical storage, reliable cooling and low running costs.',
    'washing-machine': 'A hard-working washing machine that takes the effort out of laundry day for the whole family.',
    'led-tv': 'A smart LED television for movies, cricket and family time, with a clear panel and built-in streaming apps.',
    bikes: 'A fuel-efficient commuter motorbike built for daily city travel and low running costs.',
  }[category] ?? 'A quality product available on easy monthly installments.';

  const specLine = details.specs.length
    ? ` Key specs: ${details.specs.map((s) => `${s.key} ${s.value}`).join(' · ')}.`
    : '';

  return `${name} — ${lead}${specLine} Available at Qist Store with a low advance of Rs ${advanceRs.toLocaleString('en-PK')} and flexible 6, 12 or 18 month plans. Free delivery nationwide, company warranty and a simple CNIC-based verification process.`;
}

function readRows() {
  if (!fs.existsSync(SOURCE_DATA)) {
    throw new Error(`Source data not found: ${SOURCE_DATA}`);
  }
  const rows = JSON.parse(fs.readFileSync(SOURCE_DATA, 'utf8'));
  if (!Array.isArray(rows)) throw new Error('products_flat.json must be an array');
  return rows;
}

/** Deduplicate by source id, then by normalized title + advance (the scrape repeated rows). */
function dedupe(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (row && Number.isFinite(Number(row.id)) && !byId.has(Number(row.id))) byId.set(Number(row.id), row);
  }
  const seen = new Set();
  const out = [];
  for (const row of byId.values()) {
    const title = cleanTitle(row.title ?? '');
    const advance = Number(row.advanceAmount);
    if (!title || !Number.isFinite(advance) || advance <= 0) continue;
    const key = `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${advance}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...row, cleanedTitle: title, advanceAmount: advance });
  }
  return out;
}

/** All distinct image basenames per source product id (folders are duplicated copies). */
function indexImages() {
  const index = new Map();
  if (!fs.existsSync(SOURCE_IMAGES)) return index;
  for (const folder of fs.readdirSync(SOURCE_IMAGES)) {
    const dir = path.join(SOURCE_IMAGES, folder);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
      const id = file.split('_')[0];
      if (!index.has(id)) index.set(id, new Set());
      index.get(id).add(file);
    }
  }
  return index;
}

const imageStats = { invalid: 0, missing: 0, valid: 0 };

/**
 * Image magic numbers. The supplied assets folder contains 1,130 files whose
 * extensions say jpeg/png/webp but whose bytes are identical 15.7 KB
 * "Page Not Found | Qist Bazaar" HTML pages, so extension checks are not
 * enough — never publish a file the browser cannot decode.
 */
function isValidImage(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const hex = buffer.subarray(0, 12).toString('hex');
  const ascii = buffer.subarray(0, 12).toString('ascii');
  return (
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e47') || // PNG
    (ascii.startsWith('RIFF') && buffer.subarray(8, 12).toString('ascii') === 'WEBP') || // WebP
    (buffer.subarray(4, 8).toString('ascii') === 'ftyp' && /avif|avis/.test(buffer.subarray(8, 12).toString('ascii'))) // AVIF
  );
}

function copyImage(file, category, sourceFolderHint) {
  // The source image folder is optional: it may have been cleaned up after
  // the one-time import (every supplied file was an invalid 404 HTML page).
  if (!fs.existsSync(SOURCE_IMAGES)) {
    imageStats.missing++;
    return null;
  }
  const candidates = [
    path.join(SOURCE_IMAGES, sourceFolderHint, file),
    ...fs.readdirSync(SOURCE_IMAGES)
      .filter((folder) => CATEGORY_SLUGS.has(folder))
      .map((folder) => path.join(SOURCE_IMAGES, folder, file)),
  ];
  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    imageStats.missing++;
    return null;
  }
  if (!isValidImage(fs.readFileSync(source))) {
    imageStats.invalid++;
    return null;
  }

  const destDir = path.join(PUBLIC_IMAGES, category);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, file);
  if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
  imageStats.valid++;
  return `/products/${category}/${file}`;
}

/** Remove images left over from a previous import run (only inside client/public/products). */
function pruneImages(products) {
  if (!fs.existsSync(PUBLIC_IMAGES)) return 0;
  const keep = new Set(products.flatMap((p) => p.images.map((img) => img.url.replace(/^\/products\//, ''))));
  let removed = 0;
  for (const category of fs.readdirSync(PUBLIC_IMAGES)) {
    const dir = path.join(PUBLIC_IMAGES, category);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (keep.has(`${category}/${file}`)) continue;
      fs.rmSync(path.join(dir, file));
      removed++;
    }
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  return removed;
}

function build() {
  const rows = dedupe(readRows());
  const images = indexImages();
  const products = [];
  const skippedUnknown = [];
  const brandUsage = new Map();
  const categoryUsage = new Map();

  for (const [rowIndex, row] of rows.entries()) {
    const category = classify(row.cleanedTitle);
    if (!category) {
      skippedUnknown.push({ id: row.id, title: row.cleanedTitle });
      continue;
    }
    const brand = detectBrand(row.cleanedTitle);
    if (!brand) {
      skippedUnknown.push({ id: row.id, title: row.cleanedTitle, reason: 'brand not recognised' });
      continue;
    }

    // Source ships only the advance. The store's 6-month plan uses a 25%
    // advance, so cash = advance / 0.25 keeps the card's "advance" identical
    // to the source value while producing coherent 6/12/18-month plans.
    const cashPriceRs = Math.round(row.advanceAmount * 4);

    let name = row.cleanedTitle;
    if (category === 'led-tv' && !/\b(tv|led)\b/i.test(name)) name = `${name} LED TV`;

    const details = parseDetails(name, category);
    const slug = `${slugify(name)}-${row.id}`;
    const imageFiles = [...(images.get(String(row.id)) ?? [])].sort();

    const copied = imageFiles
      .map((file) => copyImage(file, category, category))
      .filter(Boolean);

    const sourceId = Number(row.id);
    const tags = [];
    if (rows.indexOf(row) % 7 === 0) tags.push('deal-of-day');
    else if (rows.indexOf(row) % 5 === 0) tags.push('special-offer');
    if (sourceId % 4 === 0) tags.push('instant-delivery');

    products.push({
      sourceId,
      name,
      slug,
      sku: `${SKU_PREFIX[category]}-AS-${sourceId}`,
      categorySlug: category,
      brandSlug: brand.slug,
      cashPriceRs,
      description: describe(name, category, details, row.advanceAmount),
      highlights: details.highlights,
      specs: details.specs,
      tags,
      images: copied.map((url, i) => ({ url, alt: `${name} — image ${i + 1}`, sort: i })),
    });

    brandUsage.set(brand.slug, (brandUsage.get(brand.slug) ?? 0) + 1);
    categoryUsage.set(category, (categoryUsage.get(category) ?? 0) + 1);
    void rowIndex;
  }

  const removed = pruneImages(products);
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  const banner = `/**
 * AUTO-GENERATED FILE — do not edit by hand.
 * Generated by scripts/import-assets.mjs from assets/data/products_flat.json.
 *
 * ${products.length} products imported from the user-provided assets catalog.
 * ${products.flatMap((p) => p.images).length} valid image files were copied to
 * client/public/products/<category>/ (invalid source files are skipped).
 */

export type AssetProductTag = 'deal-of-day' | 'special-offer' | 'instant-delivery' | 'featured';

export interface AssetProduct {
  /** Original source product id (traceability). */
  sourceId: number;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  /** Cash price in RUPEES (converted to paisa at seed time). */
  cashPriceRs: number;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  tags: AssetProductTag[];
  images: { url: string; alt: string; sort: number }[];
}
`;
  const body = `\nexport const assetsProducts: AssetProduct[] = ${JSON.stringify(products, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, banner + body, 'utf8');

  return { products, skippedUnknown, brandUsage, categoryUsage, rows: rows.length, removed, imageStats };
}

const result = build();
const imageCount = new Set(
  result.products.flatMap((p) => p.images.map((img) => img.url)),
).size;

console.log('Asset import complete');
console.log('  source rows        :', result.rows);
console.log('  products written   :', result.products.length);
console.log('  images referenced  :', imageCount);
console.log('  image audit        :', result.imageStats);
console.log('  output data        :', path.relative(ROOT, OUTPUT_FILE));
console.log('  output images      :', path.relative(ROOT, PUBLIC_IMAGES));
console.log('  by category        :', Object.fromEntries([...result.categoryUsage.entries()].sort()));
console.log('  by brand           :', Object.fromEntries([...result.brandUsage.entries()].sort()));
console.log('  stale files pruned :', result.removed);
console.log('  without images     :', result.products.filter((p) => p.images.length === 0).map((p) => p.slug));
console.log('  skipped            :', result.skippedUnknown);
