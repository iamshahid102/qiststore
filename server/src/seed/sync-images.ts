/**
 * Product image sync — source pages → Cloudinary → MongoDB.
 *
 * The files in `assets/images` are not images (they are identical 404 HTML
 * pages). The real product photos still exist on the source backend, so this
 * script:
 *   1. Reads the live product sitemap and matches each imported product to its
 *      source page (brand + model + category aware).
 *   2. Reads the page's `og:image` (the same filename the scraper recorded in
 *      assets/data), fixes the backend URL and downloads the image.
 *   3. Validates the bytes, uploads to Cloudinary under
 *      `qiststore/products/<category>/<slug>` and remembers the secure URL.
 *   4. Generates a clean branded placeholder for demo products that have no
 *      real photo (or when the source image cannot be trusted).
 *   5. Writes `server/src/seed/product-images.ts` and updates every product's
 *      `images` array in MongoDB.
 *
 * Run: npm run sync:images
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Brand, Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { assetsProducts } from './assets-products.js';
import { curatedProducts } from './curated-products.js';
import { products as legacySeedProducts } from './data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT_FILE = path.join(ROOT, 'server', 'src', 'seed', 'product-images.ts');
const SITEMAP_URL = 'https://www.qistbazaar.pk/product_sitemap.xml';
const SITEMAP_CACHE = path.join(ROOT, 'assets', '.tmp', 'product_sitemap.xml');
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const PAGE_DELAY_MS = 180;
const MAX_PAGE_CANDIDATES = 4;

interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  sort: number;
  origin: 'source' | 'placeholder' | 'existing';
  pageUrl?: string;
  sourceUrl?: string;
}

type Manifest = Record<string, ProductImage[]>;

type DbProduct = {
  slug: string;
  name: string;
  sku: string;
  category?: { slug?: string; name?: string } | null;
  brand?: { slug?: string; name?: string } | null;
  images?: { url?: string; alt?: string; sort?: number }[];
};

type SourceTarget = {
  slug: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  sourceId?: number;
  kind: 'asset' | 'legacy';
  /** Exact source page — curated products already know it, no fuzzy matching. */
  sourcePage?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function imageFormat(buffer: Buffer): { ext: string; mime: string } | null {
  if (!buffer || buffer.length < 12) return null;
  const hex = buffer.subarray(0, 12).toString('hex');
  const ascii = buffer.subarray(0, 12).toString('ascii');
  if (hex.startsWith('ffd8ff')) return { ext: 'jpg', mime: 'image/jpeg' };
  if (hex.startsWith('89504e47')) return { ext: 'png', mime: 'image/png' };
  if (ascii.startsWith('RIFF') && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return { ext: 'avif', mime: 'image/avif' };
  }
  if (ascii.startsWith('GIF8')) return { ext: 'gif', mime: 'image/gif' };
  return null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'image/*' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Source og:image uses `https://backend.qistbazaar.pkpublic/images/...` (missing slash). */
function normalizeSourceImage(raw: string): string | null {
  const file = raw.split('/').pop()?.split('?')[0] ?? '';
  if (!/\.(jpe?g|png|webp|avif|gif)$/i.test(file)) return null;
  return `https://backend.qistbazaar.pk/public/images/${file}`;
}

function extractOg(html: string): { url: string; alt: string } | null {
  const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  if (!image) return null;
  const alt =
    html.match(/<meta\s+property="og:image:alt"\s+content="([^"]*)"/i)?.[1]?.replace(/&amp;/g, '&') ?? '';
  return { url: image, alt };
}

// ---------------------------------------------------------------------------
// Source page matching
// ---------------------------------------------------------------------------
const STOP = new Set([
  'laptop', 'motorbike', 'mobile', 'phone', 'air', 'conditioner', 'refrigerator', 'washing',
  'machine', 'led', 'tv', 'inch', 'screen', 'ram', 'ssd', 'gb', 'with', 'and', 'the', 'or',
  'series', 'gen', 'generation', 'display', 'cool', 'only', 'inverter', 'semi', 'automatic',
  'twin', 'tub', 'top', 'load', 'single', 'bag', 'smart', 'google', 'qled', 'uhd', 'fhd', 'hd',
  'official', 'brand', 'warranty', 'mobile', 'in', 'pakistan', 'ref', 'ac',
]);

const CATEGORY_WORDS = /laptop|motorbike|air conditioner|refrigerator|washing machine|led tv|inch screen|with laptop bag/gi;

const CATEGORY_PATTERN: Record<string, RegExp> = {
  mobiles: /(infinix|tecno|vivo|itel|samsung|xiaomi|nokia|oppo|realme|smartphone|mobile|phone)/,
  laptops: /(laptop|probook|zbook|latitude|thinkpad|x1-carbon|elitebook|macbook)/,
  'led-tv': /(led-tv|google-tv|smart-tv|-tv-|-tv$|q-led|led)/,
  refrigerator: /(refrigerator|fridge)/,
  'washing-machine': /(washing-machine|washer)/,
  'air-conditioner': /(air-conditioner|split-ac|-ac-|-ac$)/,
  bikes: /(motorbike|bike)/,
  tablet: /(tablet|tab-)/,
};

const CATEGORY_EXCLUDE: Record<string, RegExp> = {
  mobiles: /(laptop|refrigerator|washing|air-conditioner|led-tv|-tv|motorbike|tablet|oven|dispenser|freezer|fan|battery|mattress|tyre)/,
  laptops: /(infinix|tecno|vivo|itel|refrigerator|washing|air-conditioner|led-tv|motorbike|tablet|oven|dispenser|freezer|fan)/,
  'led-tv': /(laptop|refrigerator|washing|air-conditioner|motorbike|tablet|oven|dispenser|freezer|fan|battery|mattress|tyre|mobile)/,
  refrigerator: /(laptop|washing|air-conditioner|led-tv|motorbike|tablet|oven|dispenser|freezer|fan|mobile)/,
  'washing-machine': /(laptop|refrigerator|air-conditioner|led-tv|motorbike|tablet|oven|dispenser|freezer|fan|mobile)/,
  'air-conditioner': /(laptop|refrigerator|washing|led-tv|motorbike|tablet|oven|dispenser|freezer|fan|mobile)/,
  bikes: /(laptop|refrigerator|washing|air-conditioner|led-tv|tablet|oven|dispenser|freezer|fan|mobile)/,
  tablet: /(laptop|refrigerator|washing|air-conditioner|led-tv|motorbike|oven|dispenser|freezer|fan|mobile)/,
};

function modelTokens(name: string, brandSlug: string): string[] {
  const cleaned = name.toLowerCase().replace(CATEGORY_WORDS, ' ');
  return cleaned
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((token) => token.replace(/\./g, ''))
    .filter((token) => token && token !== brandSlug && !STOP.has(token) && token.length > 1);
}

function matchesCategory(url: string, categorySlug: string): boolean {
  const pattern = CATEGORY_PATTERN[categorySlug];
  if (!pattern || !pattern.test(url)) return false;
  const exclude = CATEGORY_EXCLUDE[categorySlug];
  return !(exclude && exclude.test(url));
}

function rankCandidates(name: string, brandSlug: string, categorySlug: string, urls: string[]) {
  const tokens = modelTokens(name, brandSlug);
  const brand = compact(brandSlug);
  return urls
    .filter((url) => compact(url).includes(brand) && matchesCategory(url, categorySlug))
    .map((url) => {
      const c = compact(url);
      let score = 0;
      let hits = 0;
      for (const token of tokens) {
        const tc = compact(token);
        if (tc.length < 2) continue;
        if (c.includes(tc)) {
          score += tc.length;
          hits++;
        }
      }
      return { url, score, hits };
    })
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.score - a.score || b.hits - a.hits || a.url.length - b.url.length)
    .slice(0, 5);
}

/** Filenames recorded by the scraper, used to pick the right page for ambiguous titles. */
function expectedFilenames(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (id: string, file: string) => {
    if (!map.has(id)) map.set(id, new Set());
    map.get(id)!.add(file);
  };

  const imageRoot = path.join(ROOT, 'assets', 'images');
  if (fs.existsSync(imageRoot)) {
    for (const folder of fs.readdirSync(imageRoot)) {
      const dir = path.join(imageRoot, folder);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of fs.readdirSync(dir)) {
        const id = file.split('_')[0];
        if (!id) continue;
        add(id, file.slice(id.length + 1));
      }
    }
  }

  const flat = path.join(ROOT, 'assets', 'data', 'products_flat.json');
  if (fs.existsSync(flat)) {
    const rows = JSON.parse(fs.readFileSync(flat, 'utf8')) as { id?: number; image?: string }[];
    for (const row of rows) {
      if (!row.id || !row.image) continue;
      const file = path.basename(row.image);
      const id = String(row.id);
      add(id, file.startsWith(`${id}_`) ? file.slice(id.length + 1) : file);
    }
  }
  return map;
}

function loadExistingManifest(): Manifest {
  if (!fs.existsSync(OUT_FILE)) return {};
  try {
    const text = fs.readFileSync(OUT_FILE, 'utf8');
    const json = text.slice(text.indexOf('= {') + 2).trim().replace(/;\s*$/, '');
    return JSON.parse(json) as Manifest;
  } catch {
    return {};
  }
}

function sourceCodeTokens(name: string, brandSlug: string): string[] {
  return modelTokens(name, brandSlug).filter(
    (token) =>
      /\d/.test(token) &&
      // Spec suffixes are shared by many variants and do not identify a model.
      !/^\d+(?:gb|ram|ssd|inch|kg|ton|cf|cc)$/i.test(token),
  );
}

async function resolveSourceImage(
  product: SourceTarget,
  candidates: { url: string }[],
  expected: Map<string, Set<string>>,
): Promise<{ sourceUrl: string; pageUrl: string; alt: string } | null> {
  let fallback: { sourceUrl: string; pageUrl: string; alt: string } | null = null;

  for (const candidate of candidates.slice(0, MAX_PAGE_CANDIDATES)) {
    try {
      await sleep(PAGE_DELAY_MS);
      const html = await fetchText(candidate.url);
      const og = extractOg(html);
      if (!og) continue;
      const sourceUrl = normalizeSourceImage(og.url);
      if (!sourceUrl) continue;
      const file = sourceUrl.split('/').pop() ?? '';

      if (!fallback) {
        fallback = {
          sourceUrl,
          pageUrl: candidate.url,
          alt: og.alt || `${product.name} — Qist Store`,
        };
      }

      if (product.sourceId != null && expected.get(String(product.sourceId))?.has(file)) {
        return { sourceUrl, pageUrl: candidate.url, alt: og.alt || `${product.name} — Qist Store` };
      }
    } catch (error) {
      console.warn(`  page failed: ${candidate.url} (${(error as Error).message})`);
    }
  }

  if (!fallback) return null;
  // Reject pages that miss every distinctive model code (e.g. a ZBook G6 page
  // that only matched "ZBook 15"). A branded placeholder is safer than a
  // wrong-generation product photo.
  const codes = sourceCodeTokens(product.name, product.brandSlug);
  if (codes.length > 0 && !codes.every((code) => compact(fallback!.pageUrl).includes(compact(code)))) {
    console.warn(`  low-confidence page for ${product.slug}: ${fallback.pageUrl}`);
    return null;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Cloudinary
// ---------------------------------------------------------------------------
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function uploadBuffer(buffer: Buffer, options: Record<string, unknown>): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
      resolve({ secure_url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

async function makePlaceholder(name: string, categorySlug: string, brandName: string): Promise<Buffer> {
  const lines = wrapLines(name, 24, 4);
  const initial = (brandName.trim().charAt(0) || name.trim().charAt(0) || 'Q').toUpperCase();
  const label = categorySlug.replace(/-/g, ' ').toUpperCase();
  const lineHeight = 62;
  const startY = 790 - ((lines.length - 1) * lineHeight) / 2;
  const nameText = lines
    .map(
      (line, index) =>
        `<text x="600" y="${startY + index * lineHeight}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="52" font-weight="600" fill="#16233F">${escapeXml(line)}</text>`,
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#F5F1E8"/>
  <rect x="0" y="0" width="1200" height="140" fill="#185ADB"/>
  <text x="70" y="90" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="800" letter-spacing="7" fill="#FFFFFF">QIST STORE</text>
  <text x="70" y="238" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="#FF8A3D">${escapeXml(label)}</text>
  <circle cx="600" cy="530" r="178" fill="#E4EBFA"/>
  <text x="600" y="600" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="160" font-weight="800" fill="#185ADB">${escapeXml(initial)}</text>
  ${nameText}
  <text x="600" y="1045" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#6B7280">Easy installments · Free delivery nationwide</text>
  <rect x="380" y="1090" width="440" height="4" rx="2" fill="#FF8A3D"/>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are missing in server/.env');
  }

  console.log('Product image sync');
  console.log(`  cloud: ${env.CLOUDINARY_CLOUD_NAME} / ${env.CLOUDINARY_FOLDER}`);

  let xml = '';
  try {
    xml = await fetchText(SITEMAP_URL);
    fs.mkdirSync(path.dirname(SITEMAP_CACHE), { recursive: true });
    fs.writeFileSync(SITEMAP_CACHE, xml);
    console.log(`  sitemap fetched: ${SITEMAP_URL}`);
  } catch (error) {
    if (!fs.existsSync(SITEMAP_CACHE)) throw error;
    xml = fs.readFileSync(SITEMAP_CACHE, 'utf8');
    console.warn(`  sitemap fetch failed, using cache (${(error as Error).message})`);
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1] ?? '')
    .filter((url) => url.includes('/product/'));
  console.log(`  source product pages: ${urls.length}`);

  await connectDb();
  const categoryRows = await Category.find({}, 'slug name').lean();
  const categoryById = new Map(categoryRows.map((category) => [String(category._id), category]));
  const brandRows = await Brand.find({}, 'slug name').lean();
  const brandById = new Map(brandRows.map((brand) => [String(brand._id), brand]));
  const rawProducts = await Product.find().lean();
  const dbProducts = rawProducts.map((product) => {
    const category = categoryById.get(String(product.category));
    const brand = brandById.get(String(product.brand));
    return {
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      category: category ? { slug: category.slug, name: category.name } : null,
      brand: brand ? { slug: brand.slug, name: brand.name } : null,
      images: product.images ?? [],
    };
  }) as DbProduct[];
  const bySlug = new Map(dbProducts.map((product) => [product.slug, product]));

  const manifest: Manifest = {};
  for (const product of dbProducts) {
    const existing = (product.images ?? [])
      .filter((image) => image.url?.startsWith('https://res.cloudinary.com/'))
      .map((image, index) => ({
        url: image.url!,
        publicId: '',
        alt: image.alt ?? product.name,
        sort: image.sort ?? index,
        origin: 'existing' as const,
      }));
    if (existing.length > 0) manifest[product.slug] = existing;
  }
  console.log(`  products in DB: ${dbProducts.length}, already on Cloudinary: ${Object.keys(manifest).length}`);

  const expected = expectedFilenames();
  const previous = loadExistingManifest();
  const assetSlugs = new Set([
    ...assetsProducts.map((product) => product.slug),
    ...curatedProducts.map((product) => product.slug),
  ]);
  const legacyBySlug = new Map(legacySeedProducts.map((product) => [product.slug, product]));

  // Imported catalog first, then the legacy demo rows that map to a real model
  // (Latitude 5420, ProBook 450 G10, Tab A9, SuperPower bikes, Haier 32" TV...).
  const targets: SourceTarget[] = assetsProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    brandSlug: product.brandSlug,
    categorySlug: product.categorySlug,
    sourceId: product.sourceId,
    kind: 'asset' as const,
  }));
  for (const product of curatedProducts) {
    targets.push({
      slug: product.slug,
      name: product.name,
      brandSlug: product.brandSlug ?? '',
      categorySlug: product.categorySlug,
      sourceId: product.sourceId,
      kind: 'asset',
      sourcePage: product.sourcePage,
    });
  }
  for (const product of dbProducts) {
    if (assetSlugs.has(product.slug)) continue;
    const seed = legacyBySlug.get(product.slug);
    const brandSlug = seed?.brandSlug ?? product.brand?.slug;
    const categorySlug = product.category?.slug;
    if (!brandSlug || !categorySlug) continue;
    targets.push({ slug: product.slug, name: product.name, brandSlug, categorySlug, kind: 'legacy' });
  }

  let fromSource = 0;
  let placeholders = 0;
  let reused = 0;
  const failures: { slug: string; reason: string }[] = [];

  for (const product of targets) {
    const dbProduct = bySlug.get(product.slug);
    if (!dbProduct) {
      failures.push({ slug: product.slug, reason: 'not in DB (run npm run seed first)' });
      continue;
    }

    // Asset sources are stable — reuse them. Legacy demo rows are re-checked
    // every run so a wrong-model match can be downgraded to a placeholder.
    const prior = previous[product.slug]?.[0];
    if (prior?.origin === 'source' && product.kind === 'asset') {
      manifest[product.slug] = previous[product.slug]!;
      reused++;
      continue;
    }
    const keepPrior = Boolean(prior && (product.kind === 'asset' || prior.origin === 'placeholder'));
    const restorePrior = () => {
      if (keepPrior) manifest[product.slug] = previous[product.slug]!;
      else delete manifest[product.slug];
    };

    const candidates = product.sourcePage
      ? [{ url: product.sourcePage }]
      : rankCandidates(product.name, product.brandSlug, product.categorySlug, urls);
    if (candidates.length === 0) {
      restorePrior();
      failures.push({ slug: product.slug, reason: 'no source page candidate' });
      continue;
    }

    const resolved = await resolveSourceImage(product, candidates, expected);
    if (!resolved) {
      restorePrior();
      failures.push({ slug: product.slug, reason: 'no confident source image' });
      continue;
    }

    try {
      const buffer = await fetchImage(resolved.sourceUrl);
      const format = imageFormat(buffer);
      if (!format) throw new Error('source returned a non-image payload');

      const uploaded = await uploadBuffer(buffer, {
        folder: `${env.CLOUDINARY_FOLDER.replace(/\/$/, '')}/${product.categorySlug}`,
        public_id: product.slug,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
      });

      manifest[product.slug] = [
        {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          alt: `${product.name} — Qist Store`,
          sort: 0,
          origin: 'source',
          pageUrl: resolved.pageUrl,
          sourceUrl: resolved.sourceUrl,
        },
      ];
      fromSource++;
      console.log(`  ✓ ${product.kind === 'asset' ? product.sourceId : 'legacy'} ${product.slug} (${Math.round(buffer.length / 1024)} KB)`);
    } catch (error) {
      restorePrior();
      failures.push({ slug: product.slug, reason: (error as Error).message });
      console.warn(`  ✗ ${product.slug}: ${(error as Error).message}`);
    }
  }

  // Placeholders for demo products and for any product that failed.
  for (const product of dbProducts) {
    if (manifest[product.slug]?.length) continue;
    const categorySlug = product.category?.slug ?? 'products';
    try {
      const brandName = product.name.split(/[|\s]/)[0] ?? 'Q';
      const buffer = await makePlaceholder(product.name, categorySlug, brandName);
      const uploaded = await uploadBuffer(buffer, {
        folder: `qiststore/placeholders/${categorySlug}`,
        public_id: product.slug,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
      });
      manifest[product.slug] = [
        {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          alt: `${product.name} — Qist Store`,
          sort: 0,
          origin: 'placeholder',
        },
      ];
      placeholders++;
      console.log(`  ▣ ${product.slug} placeholder`);
    } catch (error) {
      failures.push({ slug: product.slug, reason: `placeholder upload failed: ${(error as Error).message}` });
    }
  }

  // Stable ordering for the generated manifest.
  const ordered: Manifest = {};
  for (const slug of Object.keys(manifest).sort()) ordered[slug] = manifest[slug]!;

  const sourceTotal = Object.values(ordered).filter((images) => images[0]?.origin === 'source').length;
  const placeholderTotal = Object.values(ordered).filter((images) => images[0]?.origin === 'placeholder').length;

  const header = `/**
 * AUTO-GENERATED FILE — do not edit by hand.
 * Generated by server/src/seed/sync-images.ts on ${new Date().toISOString()}.
 *
 * Cloudinary-backed product images, keyed by product slug.
 * ${sourceTotal} source photos · ${placeholderTotal} branded placeholders.
 */

export interface SeedProductImage {
  url: string;
  publicId: string;
  alt: string;
  sort: number;
  origin: 'source' | 'placeholder' | 'existing';
  pageUrl?: string;
  sourceUrl?: string;
}

export const productImages: Record<string, SeedProductImage[]> = `;

  fs.writeFileSync(OUT_FILE, `${header}${JSON.stringify(ordered, null, 2)};\n`, 'utf8');

  let updated = 0;
  for (const [slug, images] of Object.entries(ordered)) {
    const result = await Product.updateOne(
      { slug },
      { $set: { images: images.map(({ url, alt, sort }) => ({ url, alt, sort })) } },
    );
    if (result.matchedCount > 0) updated++;
  }

  console.log('\nImage sync complete');
  console.log(`  source photos        : ${sourceTotal} (${fromSource} new uploads)`);
  console.log(`  branded placeholders : ${placeholderTotal} (${placeholders} new uploads)`);
  console.log(`  existing reused      : ${reused}`);
  console.log(`  DB products updated: ${updated}`);
  console.log(`  manifest           : ${path.relative(ROOT, OUT_FILE)}`);
  if (failures.length) {
    console.log('  source failures:');
    for (const failure of failures) console.log(`    - ${failure.slug}: ${failure.reason}`);
  }

  await disconnectDb();
}

main().catch(async (error) => {
  console.error('Image sync failed:', error);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
