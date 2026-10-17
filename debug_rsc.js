const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const responseData = [];
  page.on('response', async resp => {
    const url = resp.url();
    console.log('Response URL:', url.substring(0, 100));
    if (url.includes('?_rsc=') || url.includes('/_next/')) {
      try {
        const text = await resp.text();
        responseData.push({ url, length: text.length, preview: text.substring(0, 200) });
      } catch(e) {
        console.log('Error reading response:', e.message);
      }
    }
  });
  
  await page.goto('https://www.qistbazaar.pk/mobiles', { 
    waitUntil: 'domcontentloaded', 
    timeout: 30000 
  });
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('\nResponse data collected:', responseData.length);
  for (const r of responseData) {
    console.log('URL:', r.url.substring(0, 80));
    console.log('Length:', r.length);
    console.log('Preview:', r.preview);
    console.log('---');
  }
  
  await browser.close();
})();
