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

// Ensure directories exist
[ASSET_DIR, IMAGES_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function parseRSC(data) {
  if (!data || typeof data !== 'string') {
    return [];
  }
  
  const lines = data.split('\n');
  const result = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    try {
      if (trimmed.startsWith('1:"')) {
        result.push(trimmed.substring(4, trimmed.length - 1));
      } else if (trimmed.match(/^\d+:"/)) {
        const match = trimmed.match(/^(\d+):"(.*) "$/);
        if (match) result.push(match[2]);
      } else if (trimmed.startsWith('b:')) {
        try {
          result.push(JSON.parse(trimmed.substring(2)));
        } catch(e) {
          result.push(trimmed);
        }
      } else if (trimmed.startsWith(':')) {
        try {
          const inner = trimmed.substring(2);
          const parsed = JSON.parse(inner);
          result.push({ hint: true, ...parsed });
        } catch(e) {
          result.push(trimmed);
        }
      } else if (trimmed.match(/^\d+:/)) {
        const colonIdx = trimmed.indexOf(':');
        const jsonStr = trimmed.substring(colonIdx + 1);
        // Check if it looks like JSON
        if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
          try {
            result.push(JSON.parse(jsonStr));
          } catch(e) {
            result.push(trimmed);
          }
        } else {
          result.push(trimmed);
        }
      } else {
        // Just push the raw line
        result.push(trimmed);
      }
    } catch(e) {
      result.push(trimmed);
    }
  }
  
  console.log(`parseRSC returning ${result.length} items`);
  return result;
}

function extractProductsFromChunk(chunk) {
  const products = [];
  
  if (!chunk || typeof chunk !== 'object') return products;
  
  // Recursively search for products in nested arrays
  function searchForProducts(obj, depth = 0) {
    if (depth > 10) return; // Prevent infinite recursion
    
    if (Array.isArray(obj)) {
      // Check if this is a component with products
      if (obj[0] === '$' && obj[1] && typeof obj[1] === 'string' && obj[2] && typeof obj[2] === 'object') {
        const data = obj[2];
        if (data.products && Array.isArray(data.products)) {
          console.log(`Found ${data.products.length} products in ${obj[1]}`);
          for (const p of data.products) {
            if (p.productID && p.title) {
              products.push({
                id: p.productID,
                title: p.title,
                slug: p.slug || '',
                image: p.productImage || '',
                displayAmount: p.DisplayAmount || 0,
                oldDisplayAmount: p.OldDisplayAmount || null,
                status: p.status || 1,
                category: p.category || '',
                storeDetail: p.storeDetail || []
              });
            }
          }
        }
      }
      
      // Recursively search in array elements
      for (const item of obj) {
        searchForProducts(item, depth + 1);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // Recursively search in object values
      for (const key of Object.keys(obj)) {
        searchForProducts(obj[key], depth + 1);
      }
    }
  }
  
  searchForProducts(chunk);
  return products;
}

async function scrapeCategory(page, category) {
  console.log(`\n=== Scraping category: ${category} ===`);
  
  try {
    let rscData = null;
    
    // Set up response listener BEFORE navigation
    page.removeAllListeners('response');
    const responseHandler = async (resp) => {
      if (resp.url().includes('?_rsc=')) {
        try {
          rscData = await resp.text();
        } catch(e) {
          console.log(`Error getting RSC response body: ${e.message}`);
        }
      }
    };
    page.on('response', responseHandler);
    
    await page.goto(`https://www.qistbazaar.pk/${category}`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    
    // Wait for React to hydrate and RSC to arrive
    await new Promise(r => setTimeout(r, 5000));
    
    // Scroll to trigger loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 1000));
    
    // Remove listener
    page.off('response', responseHandler);
    
    if (!rscData) {
      console.log(`No RSC data for ${category}`);
      return [];
    }
    
    let chunks = [];
    try {
      chunks = parseRSC(rscData);
      console.log(`Parsed ${chunks.length} chunks`);
    } catch(e) {
      console.log(`Parse error: ${e.message}`);
      console.log(`rscData type: ${typeof rscData}, length: ${rscData ? rscData.length : 0}`);
    }
    
    if (!Array.isArray(chunks)) {
      console.log(`chunks is not array: ${typeof chunks}`);
      return [];
    }
    

    
    // Get unique component names that have products
    const componentNames = new Set();
    for (const chunk of chunks) {
      if (Array.isArray(chunk) && chunk[0] === '$' && typeof chunk[1] === 'string') {
        componentNames.add(chunk[1]);
      }
    }
    console.log('Components found:', Array.from(componentNames).join(', '));
    
    const products = [];
    
    for (const chunk of chunks) {
      const found = extractProductsFromChunk(chunk);
      if (found.length > 0) {
        console.log(`Extracted ${found.length} products from a chunk`);
      }
      products.push(...found);
    }
    
    // Deduplicate by productID
    const seen = new Set();
    const uniqueProducts = products.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    
    console.log(`Found ${uniqueProducts.length} products in ${category}`);
    if (uniqueProducts.length > 0 && uniqueProducts.length < 10) {
      console.log('Sample product:', JSON.stringify(uniqueProducts[0], null, 2));
    }
    return uniqueProducts;
    
  } catch (error) {
    console.error(`Error scraping ${category}: ${error.message}`);
    return [];
  }
}

async function downloadImage(imagePath, productId, category) {
  if (!imagePath) return null;
  
  try {
    // Convert relative path to full URL
    let imageUrl = imagePath;
    if (imagePath.startsWith('public/')) {
      imageUrl = `https://www.qistbazaar.pk/${imagePath.replace('public/', '')}`;
    } else if (!imagePath.startsWith('http')) {
      imageUrl = `https://www.qistbazaar.pk/${imagePath}`;
    }
    
    // Clean filename
    const cleanName = imagePath.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');
    const categoryDir = path.join(IMAGES_DIR, category);
    if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });
    
    const fileName = `${productId}_${cleanName}`;
    const filePath = path.join(categoryDir, fileName);
    
    // Check if already downloaded
    if (fs.existsSync(filePath)) {
      return `images/${category}/${fileName}`;
    }
    
    // Download using curl/wget for better reliability
    const cmd = `curl -s -L "${imageUrl}" -o "${filePath}"`;
    execSync(cmd, { timeout: 30000 });
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      console.log(`Downloaded: ${fileName}`);
      return `images/${category}/${fileName}`;
    }
    
    console.log(`Failed to download: ${imageUrl}`);
    return null;
  } catch (error) {
    console.log(`Error downloading image: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Qist Bazaar Product Scraper ===\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  
  const allProducts = {};
  
  // Scraping first 3 categories for testing
  const testCategories = CATEGORIES.slice(0, 3);
  
  for (const category of testCategories) {
    console.log(`\nScraping: ${category}`);
    const products = await scrapeCategory(page, category);
    
    if (products.length > 0) {
      allProducts[category] = [];
      
      for (const product of products) {
        const imagePath = await downloadImage(
          product.image, 
          product.id, 
          category
        );
        
        allProducts[category].push({
          id: product.id,
          title: product.title,
          slug: product.slug,
          image: imagePath,
          advanceAmount: product.displayAmount,
          originalPrice: product.oldDisplayAmount,
          status: product.status,
          category: category
        });
      }
      console.log(`  Saved ${products.length} products for ${category}`);
    }
  }
  
  await browser.close();
  
  // Save all data as JSON
  const outputPath = path.join(DATA_DIR, 'products.json');
  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
  
  // Also create a flat list
  const flatList = [];
  for (const [category, products] of Object.entries(allProducts)) {
    for (const product of products) {
      flatList.push({
        ...product,
        category: category
      });
    }
  }
  
  const flatPath = path.join(DATA_DIR, 'products_flat.json');
  fs.writeFileSync(flatPath, JSON.stringify(flatList, null, 2));
  
  // Summary
  console.log('\n=== Scraping Complete ===');
  console.log(`Total categories: ${Object.keys(allProducts).length}`);
  console.log(`Total products: ${flatList.length}`);
  
  for (const [category, products] of Object.entries(allProducts)) {
    console.log(`  ${category}: ${products.length} products`);
  }
  
  console.log(`\nData saved to: ${DATA_DIR}`);
  console.log(`Images saved to: ${IMAGES_DIR}`);
}

main().catch(console.error);
