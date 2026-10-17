const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CATEGORIES = [
  'mobiles', 'laptops', 'led-tv', 'refrigerator', 'washing-machine',
  'air-conditioner', 'microwave-oven', 'water-dispenser', 'fans',
  'bikes', 'deep-freezer', 'batteries', 'mattress', 'tyres', 'tablet', 'solar'
];

const ASSETS_DIR = path.join(__dirname, 'assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const DATA_DIR = path.join(ASSETS_DIR, 'data');

[ASSETS_DIR, IMAGES_DIR, DATA_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function extractProducts(rscData) {
  const products = [];
  const regex = /\{\s*"productID":\s*(\d+),[^}]*?"title":\s*"([^"]+)"[^}]*?\}/g;
  let match;
  
  while ((match = regex.exec(rscData)) !== null) {
    const ctx = rscData.substring(Math.max(0, match.index - 200), Math.min(rscData.length, match.index + match[0].length + 200));
    
    const imgMatch = ctx.match(/"productImage":"([^"]+)"/);
    const priceMatch = ctx.match(/"DisplayAmount":(\d+)/);
    const slugMatch = ctx.match(/"slug":"([^"]+)"/);
    
    products.push({
      id: parseInt(match[1]),
      title: match[2],
      image: imgMatch ? imgMatch[1] : '',
      price: priceMatch ? parseInt(priceMatch[1]) : 0,
      slug: slugMatch ? slugMatch[1] : ''
    });
  }
  
  const seen = new Set();
  return products.filter(p => !seen.has(p.id) && seen.add(p.id));
}

function downloadImage(imagePath, productId, category) {
  if (!imagePath) return null;
  try {
    let url = imagePath.startsWith('http') ? imagePath :
              imagePath.startsWith('public/') ? `https://www.qistbazaar.pk/${imagePath.replace('public/', '')}` :
              `https://www.qistbazaar.pk/${imagePath}`;
    
    const cleanName = path.basename(imagePath).replace(/[^a-zA-Z0-9._-]/g, '_');
    const catDir = path.join(IMAGES_DIR, category);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
    
    const filePath = path.join(catDir, `${productId}_${cleanName}`);
    if (fs.existsSync(filePath)) return `images/${category}/${productId}_${cleanName}`;
    
    execSync(`curl -s -L "${url}" -o "${filePath}"`, { timeout: 20000 });
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      return `images/${category}/${productId}_${cleanName}`;
    }
    return null;
  } catch (e) { return null; }
}

async function scrapeCategory(browser, category) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  let rscData = null;
  page.on('response', async resp => {
    if (resp.url().includes('?_rsc=')) {
      try { rscData = await resp.text(); } catch(e) {}
    }
  });
  
  try {
    await page.goto(`https://www.qistbazaar.pk/${category}`, {
      waitUntil: 'load', timeout: 30000
    });
    await new Promise(r => setTimeout(r, 4000));
    
    if (!rscData) return [];
    
    const products = extractProducts(rscData);
    console.log(`${category}: ${products.length} products`);
    return products;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('=== Qist Bazaar Scraper ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const allData = {};
  let total = 0;
  
  for (const cat of CATEGORIES) {
    try {
      const products = await scrapeCategory(browser, cat);
      
      if (products.length > 0) {
        allData[cat] = [];
        for (const p of products) {
          const img = downloadImage(p.image, p.id, cat);
          allData[cat].push({
            id: p.id, title: p.title, slug: p.slug,
            image: img, advanceAmount: p.price, category: cat
          });
        }
        total += products.length;
      }
    } catch (e) {
      console.error(`${cat}: ${e.message}`);
    }
  }
  
  await browser.close();
  
  fs.writeFileSync(path.join(DATA_DIR, 'products.json'), JSON.stringify(allData, null, 2));
  
  const flat = [];
  for (const [cat, prods] of Object.entries(allData)) {
    for (const p of prods) flat.push({ ...p, category: cat });
  }
  fs.writeFileSync(path.join(DATA_DIR, 'products_flat.json'), JSON.stringify(flat, null, 2));
  
  console.log('\n=== DONE ===');
  console.log(`Total: ${total} products from ${Object.keys(allData).length} categories`);
  console.log(`Data: ${DATA_DIR}/`);
  console.log(`Images: ${IMAGES_DIR}/`);
  
  for (const [cat, prods] of Object.entries(allData)) {
    console.log(`  ${cat}: ${prods.length}`);
  }
}

main().catch(console.error);
