const puppeteer = require('puppeteer');

// Parse RSC format - extract all embedded JSON
function parseRSCData(rscText) {
  const results = [];
  
  // The RSC format has JSON arrays that may span multiple lines
  // Example: 79:I[4397,["6079","...","2557","..."],{"products":[...}]
  // We need to find all complete JSON objects/arrays
  
  // First, find all potential JSON start positions
  let i = 0;
  while (i < rscText.length) {
    // Look for patterns like NUMBER:{ or NUMBER:[ or :[ or b:{
    let jsonStart = -1;
    let prefix = '';
    
    // Check for :[ or b:{ or digit:[ or digit:{
    if (rscText[i] === ':' && (rscText[i+1] === '[' || rscText[i+1] === '{')) {
      jsonStart = i + 1;
      prefix = ':';
    } else if (rscText[i] === 'b' && rscText[i+1] === ':') {
      if (rscText[i+2] === '{' || rscText[i+2] === '[') {
        jsonStart = i + 2;
        prefix = 'b:';
      }
    } else if (/\d/.test(rscText[i])) {
      // Find the colon after digits
      let j = i;
      while (j < rscText.length && /\d/.test(rscText[j])) j++;
      if (rscText[j] === ':' && (rscText[j+1] === '[' || rscText[j+1] === '{')) {
        jsonStart = j + 1;
      }
    }
    
    if (jsonStart > 0) {
      // Find the matching closing bracket
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
          const parsed = JSON.parse(jsonStr);
          results.push(parsed);
        } catch(e) {
          // Store raw string if parsing fails
          results.push(jsonStr);
        }
        i = k;
        continue;
      }
    }
    
    i++;
  }
  
  console.log(`Parsed ${results.length} JSON items from RSC`);
  return results;
}

// Recursively find all objects with products array
function findProducts(obj, path = '') {
  const products = [];
  
  if (Array.isArray(obj)) {
    // Check if this array is a React element with products
    if (obj.length >= 3 && typeof obj[0] === 'string' && obj[0] === '$' && typeof obj[1] === 'string') {
      const componentData = obj[2];
      if (componentData && typeof componentData === 'object' && Array.isArray(componentData.products)) {
        console.log(`Found products in component ${obj[1]} at path ${path}`);
        for (const p of componentData.products) {
          if (p.productID) {
            products.push(p);
          }
        }
      }
    }
    
    // Recursively search in array items
    for (let i = 0; i < obj.length; i++) {
      products.push(...findProducts(obj[i], `${path}[${i}]`));
    }
  } else if (obj && typeof obj === 'object') {
    // Recursively search in object values
    for (const key of Object.keys(obj)) {
      products.push(...findProducts(obj[key], `${path}.${key}`));
    }
  }
  
  return products;
}

async function main() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  let rscData = null;
  const responses = [];
  
  page.on('response', async resp => {
    const url = resp.url();
    console.log('Response:', url.substring(0, 80));
    
    if (url.includes('?_rsc=')) {
      try {
        rscData = await resp.text();
        console.log(`Captured RSC: ${rscData.length} bytes`);
      } catch(e) {
        console.log('Error capturing RSC:', e.message);
      }
    }
    
    // Also capture any JSON responses
    const contentType = resp.headers()['content-type'] || '';
    if (contentType.includes('json') && !url.includes('google') && !url.includes('analytics')) {
      try {
        const text = await resp.text();
        responses.push({ url, text: text.substring(0, 500) });
      } catch(e) {}
    }
  });
  
  console.log('Navigating to page...');
  await page.goto('https://www.qistbazaar.pk/mobiles', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  });
  
  console.log('Waiting for page to load...');
  await new Promise(r => setTimeout(r, 6000));
  
  console.log('Scrolling...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
  
  if (!rscData) {
    console.log('No RSC data captured');
    return;
  }
  
  // Parse RSC
  const parsedItems = parseRSCData(rscData);
  console.log(`Parsed ${parsedItems.length} items from RSC`);
  
  // Search for product data in raw RSC
  console.log('Searching for product data in RSC...');
  const productMatches = rscData.match(/"productID":\d+/g);
  console.log(`Found ${productMatches ? productMatches.length : 0} product references`);
  
  // Find all JSON objects containing products
  let allProducts = [];
  
  // Search through parsed items
  for (let idx = 0; idx < parsedItems.length; idx++) {
    const item = parsedItems[idx];
    const itemStr = JSON.stringify(item);
    
    if (itemStr.includes('productID') || itemStr.includes('DisplayAmount')) {
      console.log(`Item ${idx} contains product data:`);
      console.log(itemStr.substring(0, 500));
      console.log('---');
    }
    
    if (typeof item === 'object' && item !== null) {
      // Check if this item has products directly
      if (item.products && Array.isArray(item.products)) {
        console.log(`Item ${idx} has ${item.products.length} products directly`);
        allProducts = allProducts.concat(item.products);
      }
      
      // Recursively search
      const found = findProducts(item);
      if (found.length > 0) {
        console.log(`Found ${found.length} products in item ${idx}`);
      }
      allProducts = allProducts.concat(found);
    }
  }
  
  // Deduplicate
  const seen = new Set();
  allProducts = allProducts.filter(p => {
    if (seen.has(p.productID)) return false;
    seen.add(p.productID);
    return true;
  });
  
  console.log(`\nTotal unique products found: ${allProducts.length}`);
  
  if (allProducts.length > 0) {
    console.log('\nFirst 3 products:');
    allProducts.slice(0, 3).forEach((p, i) => {
      console.log(`${i+1}. ${p.title} (ID: ${p.productID})`);
      console.log(`   Image: ${p.productImage}`);
      console.log(`   Price: ${p.DisplayAmount}`);
    });
  }
}

main().catch(console.error);
