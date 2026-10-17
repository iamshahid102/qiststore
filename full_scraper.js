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

// Extract products from RSC data
function extractProductsFromRSC(rscData) {
  const products = [];
  const regex = /\{\s*"productID":\s*(\d+),[^}]*?"title":\s*"([^"]+)"[^}]*?\}/g;
  let match;
  
  while ((match = regex.exec(rscData)) !== null) {
    const contextStart = Math.max(0, match.index - 300);
    const contextEnd = Math.min(rscData.length, match.index + match[0].length + 300);
    const context = rscData.substring(contextStart, contextEnd);
    
    const imageMatch = context.match(/"productImage":"([^"]+)"/);
    const priceMatch = context.match(/"DisplayAmount":(\d+)/);
    const slugMatch = context.match(/"slug":"([^"]+)"/);
    
    products.push({
      id: parseInt(match[1]),
      title: match[2],
      image: imageMatch ? imageMatch[1] : '',
      price: priceMatch ? parseInt(priceMatch[1]) : 0,
      slug: slugMatch ? slugMatch[1] : ''
    });
  }
  
  // Deduplicate by ID
  const seen = new Set();
  return products.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// Download image using curl
function downloadImage(imagePath, productId, category) {
  if (!imagePath) return null;
  
  try {
    let url = imagePath;
    if (imagePath.startsWith('public/')) {
      url = `https://www.qistbazaar.pk/${imagePath.replace('public/', '')}`;
    } else if (!imagePath.startsWith('http')) {
      url = `https://www.qistbazaar.pk/${imagePath}`;
    }
    
    const cleanName = path.basename(imagePath).replace(/[^a-zA-Z0-9._-]/g, '_');
    const catDir = path.join(IMAGES_DIR, category);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
    
    const fileName = `${productId}_${cleanName}`;
    const filePath = path.join(catDir, fileName);
    
    if (fs.existsSync(filePath)) return `images/${category}/${fileName}`;
    
    execSync(`curl -s -L "${url}" -o "${filePath}"`, { timeout: 30000 });
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100) {
      console.log(`  Downloaded: ${fileName}`);
      return `images/${category}/${fileName}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function scrapeCategory(page, category) {
  console.log(`\nScraping: ${category}`);
  
  let rscData = null;
  const handler = async (resp) => {
    if (resp.url().includes('?_rsc=')) {
      try { rscData = await resp.text(); } catch(e) {}
    }
  };
  
  page.on('response', handler);
  await page.goto(`https://www.qistbazaar.pk/${category}`, {
    waitUntil: 'load',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 6000));
  page.off('response', handler);
  
  if (!rscData) {
    console.log(`  No data`);
    return [];
  }
  
  const products = extractProductsFromRSC(rscData);
  console.log(`  Found ${products.length} products`);
  return products;
}

async function main() {
  console.log('=== Qist Bazaar Full Scraper ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const allData = {};
  let totalCount = 0;
  
  for (const cat of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, cat);
      
      if (products.length > 0) {
        allData[cat] = [];
        
        for (const prod of products) {
          const imgPath = await downloadImage(prod.image, prod.id, cat);
          
          allData[cat].push({
            id: prod.id,
            title: prod.title,
            slug: prod.slug,
            image: imgPath,
            advanceAmount: prod.price,
            category: cat
          });
        }
        
        totalCount += products.length;
      }
    } catch (e) {
      console.error(`Error ${cat}: ${e.message}`);
    }
  }
  
  await browser.close();
  
  // Save JSON
  fs.writeFileSync(
    path.join(DATA_DIR, 'products.json'),
    JSON.stringify(allData, null, 2)
  );
  
  // Flat list
  const flat = [];
  for (const [cat, prods] of Object.entries(allData)) {
    for (const p of prods) {
      flat.push({ ...p, category: cat });
    }
  }
  fs.writeFileSync(
    path.join(DATA_DIR, 'products_flat.json'),
    JSON.stringify(flat, null, 2)
  );
  
  console.log('\n=== COMPLETE ===');
  console.log(`Total: ${totalCount} products`);
  console.log(`Categories: ${Object.keys(allData).length}`);
  console.log(`\nData: ${DATA_DIR}/products.json`);
  console.log(`Images: ${IMAGES_DIR}/`);
  
  for (const [cat, prods] of Object.entries(allData)) {
    console.log(`  ${cat}: ${prods.length}`);
  }
}

main().catch(console.error);
