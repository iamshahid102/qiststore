const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CATEGORIES = [
  'mobiles', 'laptops', 'led-tv', 'refrigerator', 'washing-machine',
  'air-conditioner', 'microwave-oven', 'water-dispenser', 'fans',
  'bikes', 'deep-freezer', 'batteries', 'mattress', 'tyres', 'tablet', 'solar'
];

const ASSET_DIR = path.join(__dirname, 'assets');
const IMAGES_DIR = path.join(ASSET_DIR, 'images');
const DATA_DIR = path.join(ASSET_DIR, 'data');

[ASSET_DIR, IMAGES_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Parse RSC and extract all JSON objects
function parseRSCData(rscText) {
  const results = [];
  let i = 0;
  
  while (i < rscText.length) {
    let jsonStart = -1;
    
    // Find JSON start positions: :[, b:{, digit:[, digit:{
    if (rscText[i] === ':' && (rscText[i+1] === '[' || rscText[i+1] === '{')) {
      jsonStart = i + 1;
    } else if (rscText[i] === 'b' && rscText[i+1] === ':') {
      if (rscText[i+2] === '{' || rscText[i+2] === '[') {
        jsonStart = i + 2;
      }
    } else if (/\d/.test(rscText[i])) {
      let j = i;
      while (j < rscText.length && /\d/.test(rscText[j])) j++;
      if (rscText[j] === ':' && (rscText[j+1] === '[' || rscText[j+1] === '{')) {
        jsonStart = j + 1;
      }
    }
    
    if (jsonStart > 0) {
      const startChar = rscText[jsonStart];
      const endChar = startChar === '[' ? ']' : '}';
      let depth = 1;
      let k = jsonStart + 1;
      
      while (k < rscText.length && depth > 0) {
        if (rscText[k] === startChar) depth++;
        else if (rscText[k] === endChar) depth--;
        k++;
      }
      
      if (depth === 0) {
        const jsonStr = rscText.substring(jsonStart, k);
        try {
          results.push(JSON.parse(jsonStr));
        } catch(e) {
          results.push(jsonStr);
        }
        i = k;
        continue;
      }
    }
    i++;
  }
  
  return results;
}

// Recursively extract all products from nested structures
function extractAllProducts(obj) {
  const products = [];
  
  if (Array.isArray(obj)) {
    // Check for React component with products prop
    if (obj[0] === '$' && obj[1] && typeof obj[1] === 'string' && obj[2] && typeof obj[2] === 'object') {
      const data = obj[2];
      // Check for products in any property
      for (const key of Object.keys(data)) {
        if (key === 'products' && Array.isArray(data[key])) {
          console.log(`Found ${data[key].length} products in ${obj[1]}`);
          for (const p of data[key]) {
            if (p.productID) {
              products.push(p);
            }
          }
        }
      }
    }
    
    // Recursively search all array elements
    for (const item of obj) {
      products.push(...extractAllProducts(item));
    }
  } else if (obj && typeof obj === 'object') {
    // Recursively search all object values
    for (const key of Object.keys(obj)) {
      products.push(...extractAllProducts(obj[key]));
    }
  }
  
  return products;
}

async function downloadImage(imagePath, productId, category) {
  if (!imagePath) return null;
  
  try {
    let imageUrl = imagePath;
    if (imagePath.startsWith('public/')) {
      imageUrl = `https://www.qistbazaar.pk/${imagePath.replace('public/', '')}`;
    } else if (!imagePath.startsWith('http')) {
      imageUrl = `https://www.qistbazaar.pk/${imagePath}`;
    }
    
    const cleanName = imagePath.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');
    const categoryDir = path.join(IMAGES_DIR, category);
    if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });
    
    const fileName = `${productId}_${cleanName}`;
    const filePath = path.join(categoryDir, fileName);
    
    if (fs.existsSync(filePath)) {
      return `images/${category}/${fileName}`;
    }
    
    const cmd = `curl -s -L "${imageUrl}" -o "${filePath}"`;
    execSync(cmd, { timeout: 30000 });
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      console.log(`  Downloaded: ${fileName}`);
      return `images/${category}/${fileName}`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function scrapeCategory(page, category) {
  console.log(`\n=== Scraping: ${category} ===`);
  
  let rscData = null;
  page.removeAllListeners('response');
  
  const responseHandler = async (resp) => {
    if (resp.url().includes('?_rsc=')) {
      try {
        rscData = await resp.text();
      } catch(e) {}
    }
  };
  page.on('response', responseHandler);
  
  await page.goto(`https://www.qistbazaar.pk/${category}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));
  
  page.off('response', responseHandler);
  
  if (!rscData) {
    console.log(`No RSC data for ${category}`);
    return [];
  }
  
  const parsedItems = parseRSCData(rscData);
  let allProducts = [];
  
  for (const item of parsedItems) {
    const found = extractAllProducts(item);
    allProducts.push(...found);
  }
  
  // Deduplicate by productID
  const seen = new Set();
  const uniqueProducts = allProducts.filter(p => {
    if (seen.has(p.productID)) return false;
    seen.add(p.productID);
    return true;
  });
  
  console.log(`Found ${uniqueProducts.length} products in ${category}`);
  return uniqueProducts;
}

async function main() {
  console.log('=== Qist Bazaar Scraper ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const allProductsByCategory = {};
  let totalProducts = 0;
  
  // Process all categories
  for (const category of CATEGORIES) {
    try {
      const products = await scrapeCategory(page, category);
      
      if (products.length > 0) {
        allProductsByCategory[category] = [];
        
        for (const product of products) {
          const imagePath = await downloadImage(
            product.productImage,
            product.productID,
            category
          );
          
          allProductsByCategory[category].push({
            id: product.productID,
            title: product.title,
            slug: product.slug,
            image: imagePath,
            advanceAmount: product.DisplayAmount,
            originalPrice: product.OldDisplayAmount,
            status: product.status,
            category: category
          });
        }
        
        totalProducts += products.length;
        console.log(`  -> Saved ${products.length} products`);
      }
    } catch (error) {
      console.error(`Error scraping ${category}: ${error.message}`);
    }
  }
  
  await browser.close();
  
  // Save data
  fs.writeFileSync(
    path.join(DATA_DIR, 'products.json'),
    JSON.stringify(allProductsByCategory, null, 2)
  );
  
  // Create flat list
  const flatList = [];
  for (const [cat, prods] of Object.entries(allProductsByCategory)) {
    for (const p of prods) {
      flatList.push({ ...p, category: cat });
    }
  }
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'products_flat.json'),
    JSON.stringify(flatList, null, 2)
  );
  
  console.log('\n=== Complete ===');
  console.log(`Total products: ${totalProducts}`);
  console.log(`Categories: ${Object.keys(allProductsByCategory).length}`);
  console.log(`\nData: ${DATA_DIR}/products.json`);
  console.log(`Images: ${IMAGES_DIR}/`);
  
  for (const [cat, prods] of Object.entries(allProductsByCategory)) {
    console.log(`  ${cat}: ${prods.length} products`);
  }
}

main().catch(console.error);
