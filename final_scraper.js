const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CATEGORIES = ['mobiles', 'laptops', 'led-tv', 'refrigerator', 'washing-machine', 'air-conditioner', 'microwave-oven', 'water-dispenser', 'fans', 'bikes', 'deep-freezer', 'batteries', 'mattress', 'tyres', 'tablet', 'solar'];
const ASSETS_DIR = path.join(__dirname, 'assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const DATA_DIR = path.join(ASSETS_DIR, 'data');

// Save progress periodically
function saveProgress(data) {
  fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(data, null, 2));
  const flat = [];
  for (const [cat, prods] of Object.entries(data)) {
    for (const p of prods) flat.push({ ...p, category: cat });
  }
  fs.writeFileSync(path.join(DATA_DIR, 'products_flat.json'), JSON.stringify(flat, null, 2));
  console.log(`Saved ${Object.values(data).reduce((a, b) => a + b.length, 0)} products so far`);
}

function extractProducts(rscData) {
  const products = [];
  const regex = /\{\s*"productID":\s*(\d+),[^}]*?"title":\s*"([^"]+)"[^}]*?\}/g;
  let match;
  while ((match = regex.exec(rscData)) !== null) {
    const ctx = rscData.substring(Math.max(0, match.index - 200), Math.min(rscData.length, match.index + match[0].length + 200));
    const imgMatch = ctx.match(/"productImage":"([^"]+)"/);
    const priceMatch = ctx.match(/"DisplayAmount":(\d+)/);
    products.push({
      id: parseInt(match[1]),
      title: match[2],
      image: imgMatch ? imgMatch[1] : '',
      price: priceMatch ? parseInt(priceMatch[1]) : 0
    });
  }
  const seen = new Set();
  return products.filter(p => !seen.has(p.id) && seen.add(p.id));
}

function downloadImage(imagePath, productId, category) {
  if (!imagePath) return null;
  try {
    let url = imagePath.startsWith('http') ? imagePath : `https://www.qistbazaar.pk/${imagePath.replace('public/', '')}`;
    const cleanName = path.basename(imagePath).replace(/[^a-zA-Z0-9._-]/g, '_');
    const catDir = path.join(IMAGES_DIR, category);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
    const filePath = path.join(catDir, `${productId}_${cleanName}`);
    if (fs.existsSync(filePath)) return `images/${category}/${productId}_${cleanName}`;
    execSync(`curl -s -L "${url}" -o "${filePath}"`, { timeout: 15000 });
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      return `images/${category}/${productId}_${cleanName}`;
    }
    return null;
  } catch (e) { return null; }
}

async function scrapeCategory(page, category, allData) {
  console.log(`Scraping: ${category}...`);
  
  let rscData = null;
  const handler = async (resp) => {
    if (resp.url().includes('?_rsc=')) {
      try { rscData = await resp.text(); } catch(e) {}
    }
  };
  
  page.removeAllListeners('response');
  page.on('response', handler);
  
  try {
    await page.goto(`https://www.qistbazaar.pk/${category}`, { waitUntil: 'load', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
  } catch (e) {
    console.log(`  Navigation error: ${e.message}`);
    page.off('response', handler);
    return;
  }
  page.off('response', handler);
  
  if (!rscData) {
    console.log(`  No RSC data`);
    return;
  }
  
  const products = extractProducts(rscData);
  console.log(`  Found ${products.length} products`);
  
  if (!allData[category]) allData[category] = [];
  
  for (const p of products) {
    const img = downloadImage(p.image, p.id, category);
    allData[category].push({
      id: p.id,
      title: p.title,
      slug: p.slug || '',
      image: img,
      advanceAmount: p.price,
      category: category
    });
  }
  
  saveProgress(allData);
}

async function main() {
  console.log('=== Qist Bazaar Scraper ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--single-process']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const allData = {};
  let completed = 0;
  
  for (const cat of CATEGORIES) {
    await scrapeCategory(page, cat, allData);
    completed++;
    console.log(`Progress: ${completed}/${CATEGORIES.length}\n`);
  }
  
  await browser.close();
  
  saveProgress(allData);
  
  console.log('\n=== COMPLETE ===');
  const total = Object.values(allData).reduce((a, b) => a + b.length, 0);
  console.log(`Total products: ${total}`);
  console.log(`Categories: ${Object.keys(allData).length}`);
  console.log(`\n📁 Data: assets/data/products.json`);
  console.log(`🖼️  Images: assets/images/`);
}

main().catch(console.error);
