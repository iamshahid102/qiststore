const puppeteer = require('puppeteer');

async function scrape() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  let rscData = null;
  
  // Add listener before navigation
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('?_rsc=')) {
      console.log('Found RSC response');
      try {
        rscData = await resp.text();
        console.log(`RSC captured: ${rscData.length} bytes`);
      } catch(e) {
        console.log('Error:', e.message);
      }
    }
  });
  
  console.log('Navigating...');
  await page.goto('https://www.qistbazaar.pk/mobiles', { 
    waitUntil: 'load',
    timeout: 30000 
  });
  
  console.log('Waiting for RSC...');
  await new Promise(r => setTimeout(r, 8000));
  
  console.log('RSC data:', rscData ? rscData.length : 'null');
  await browser.close();
  
  if (!rscData) {
    console.log('No RSC data');
    return;
  }
  
  console.log(`RSC size: ${rscData.length} bytes`);
  
  // Extract all product objects using regex
  const productRegex = /\{\s*"productID":\s*(\d+),\s*"title":\s*"([^"]+)"[^}]*?\}/g;
  const products = [];
  let match;
  
  while ((match = productRegex.exec(rscData)) !== null) {
    const productId = match[1];
    const title = match[2];
    
    // Extract more fields from context
    const contextStart = Math.max(0, match.index - 500);
    const contextEnd = Math.min(rscData.length, match.index + match[0].length + 500);
    const context = rscData.substring(contextStart, contextEnd);
    
    // Extract image
    const imageMatch = context.match(/"productImage":"([^"]+)"/);
    const image = imageMatch ? imageMatch[1] : '';
    
    // Extract DisplayAmount
    const priceMatch = context.match(/"DisplayAmount":(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    // Extract slug
    const slugMatch = context.match(/"slug":"([^"]+)"/);
    const slug = slugMatch ? slugMatch[1] : '';
    
    products.push({
      id: parseInt(productId),
      title,
      image,
      price,
      slug
    });
  }
  
  console.log(`\nFound ${products.length} products:`);
  console.log(JSON.stringify(products.slice(0, 5), null, 2));
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('test_products.json', JSON.stringify(products, null, 2));
  console.log(`\nSaved to test_products.json`);
}

scrape().catch(console.error);
