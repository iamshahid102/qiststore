const puppeteer = require('puppeteer');

const categories = [
  'mobiles', 'laptops', 'led-tv', 'refrigerator', 'washing-machine',
  'air-conditioner', 'microwave-oven', 'water-dispenser', 'fans',
  'bikes', 'deep-freezer', 'batteries', 'mattress', 'tyres', 'tablet', 'solar'
];

async function scrape() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const allProducts = [];
  
  for (const cat of categories) {
    console.log(`Scraping: ${cat}`);
    try {
      await page.goto(`https://www.qistbazaar.pk/${cat}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.product-item, .product-card, [class*="product"]');
        const data = [];
        items.forEach(el => {
          const name = el.querySelector('[class*="name"], h2, h3, .title, [class*="title"]')?.innerText?.trim();
          const price = el.querySelector('[class*="price"], .price, [class*="cost"]')?.innerText?.trim();
          const advance = el.querySelector('[class*="advance"], .advance')?.innerText?.trim();
          const img = el.querySelector('img')?.src || el.querySelector('img')?.dataset?.src || '';
          const link = el.querySelector('a')?.href || '';
          if (name) data.push({ name, price, advance, image: img, url: link, category: el.closest('a')?.href?.includes('mobiles') ? 'Mobiles' : '' });
        });
        return data;
      });
      
      if (products.length === 0) {
        // Try alternative selectors
        const altProducts = await page.evaluate(() => {
          const cards = document.querySelectorAll('div');
          const data = [];
          cards.forEach(el => {
            const text = el.innerText || '';
            if (text.includes('Rs.') && text.includes('Advance')) {
              const img = el.querySelector('img')?.src || '';
              const link = el.querySelector('a')?.href || '';
              data.push({ raw: text, image: img, url: link });
            }
          });
          return data;
        });
        products.push(...altProducts);
      }
      
      allProducts.push(...products);
      console.log(`Found ${products.length} in ${cat}`);
    } catch(e) {
      console.log(`Error ${cat}: ${e.message}`);
    }
  }
  
  await browser.close();
  console.log(JSON.stringify(allProducts, null, 2));
}

scrape();
