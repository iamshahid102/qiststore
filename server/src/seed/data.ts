/**
 * Seed dataset.
 * NOTE: All content below is ORIGINAL placeholder content written for Qist Store.
 * No text/images copied from any third-party site.
 */

export interface SeedCategory {
  name: string;
  slug: string;
  icon: string;
  filters?: { key: string; label: string; type: 'enum'; options: string[] }[];
  children?: { name: string; slug: string }[];
}

export const categories: SeedCategory[] = [
  {
    name: 'Mobiles', slug: 'mobiles', icon: 'smartphone',
    filters: [
      { key: 'ram', label: 'RAM', type: 'enum', options: ['3GB', '4GB', '6GB', '8GB', '12GB'] },
      { key: 'storage', label: 'Storage', type: 'enum', options: ['64GB', '128GB', '256GB', '512GB'] },
    ],
    children: [
      { name: 'Samsung', slug: 'samsung-mobiles' },
      { name: 'Infinix', slug: 'infinix-mobiles' },
      { name: 'Tecno', slug: 'tecno-mobiles' },
      { name: 'Vivo', slug: 'vivo-mobiles' },
      { name: 'Itel', slug: 'itel-mobiles' },
    ],
  },
  { name: 'Laptops', slug: 'laptops', icon: 'laptop', children: [{ name: 'HP', slug: 'hp-laptops' }, { name: 'Dell', slug: 'dell-laptops' }, { name: 'Lenovo', slug: 'lenovo-laptops' }] },
  { name: 'LED TV', slug: 'led-tv', icon: 'tv' },
  { name: 'Refrigerator', slug: 'refrigerator', icon: 'refrigerator' },
  { name: 'Washing Machine', slug: 'washing-machine', icon: 'washingmachine' },
  { name: 'Air Conditioner', slug: 'air-conditioner', icon: 'airconditioner' },
  { name: 'Small Appliances', slug: 'small-appliances', icon: 'appliance' },
  { name: 'Microwave Oven', slug: 'microwave-oven', icon: 'microwave' },
  { name: 'Water Dispenser', slug: 'water-dispenser', icon: 'waterdispenser' },
  { name: 'Fans', slug: 'fans', icon: 'fan' },
  { name: 'Bikes', slug: 'bikes', icon: 'bike' },
  { name: 'Deep Freezer', slug: 'deep-freezer', icon: 'deepfreezer' },
  { name: 'Batteries', slug: 'batteries', icon: 'battery' },
  { name: 'Mattress', slug: 'mattress', icon: 'mattress' },
  { name: 'Tyres', slug: 'tyres', icon: 'tyre' },
  { name: 'Tablet', slug: 'tablet', icon: 'tablet' },
  { name: 'Solar', slug: 'solar', icon: 'solar' },
];

export const brands = [
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Infinix', slug: 'infinix' },
  { name: 'Tecno', slug: 'tecno' },
  { name: 'Vivo', slug: 'vivo' },
  { name: 'Itel', slug: 'itel' },
  { name: 'HP', slug: 'hp' },
  { name: 'Dell', slug: 'dell' },
  { name: 'Lenovo', slug: 'lenovo' },
  { name: 'Dawlance', slug: 'dawlance' },
  { name: 'Haier', slug: 'haier' },
  { name: 'Pel', slug: 'pel' },
  { name: 'SuperPower', slug: 'superpower' },
];

export interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  /** Cash price in RUPEES (converted to paisa at seed time). */
  cashPriceRs: number;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  tags?: ('deal-of-day' | 'special-offer' | 'instant-delivery' | 'featured')[];
}

export const products: SeedProduct[] = [
  // --- Mobiles ---
  {
    name: 'Nova X5 | 6GB-128GB', slug: 'nova-x5-6gb-128gb', sku: 'MOB-NOVA-X5-6128',
    categorySlug: 'mobiles', brandSlug: 'samsung', cashPriceRs: 42999,
    description: 'A dependable everyday smartphone with a bright 6.6" display, 50MP dual camera and a 5000mAh battery that easily lasts a full day.',
    highlights: ['6.6" FHD+ Display', '50MP Dual Camera', '5000mAh Battery', '18W Fast Charging'],
    specs: [{ key: 'RAM', value: '6GB' }, { key: 'Storage', value: '128GB' }, { key: 'Battery', value: '5000mAh' }, { key: 'Display', value: '6.6" FHD+' }],
    tags: ['deal-of-day'],
  },
  {
    name: 'Nova X5 Lite | 4GB-64GB', slug: 'nova-x5-lite-4gb-64gb', sku: 'MOB-NOVA-X5L-464',
    categorySlug: 'mobiles', brandSlug: 'samsung', cashPriceRs: 27999,
    description: 'Slim, light and fast — the X5 Lite covers calls, socials and streaming with a smooth 90Hz screen.',
    highlights: ['90Hz Display', '5000mAh Battery', 'Face Unlock'],
    specs: [{ key: 'RAM', value: '4GB' }, { key: 'Storage', value: '64GB' }],
  },
  {
    name: 'Spark Go 2026 | 4GB-128GB', slug: 'spark-go-2026', sku: 'MOB-SPARK-GO-26',
    categorySlug: 'mobiles', brandSlug: 'tecno', cashPriceRs: 33999,
    description: 'Budget champion with a big 6.7" screen and clean software tuned for first-time smartphone owners.',
    highlights: ['6.7" HD+ Display', '13MP AI Camera', '5000mAh Battery'],
    specs: [{ key: 'RAM', value: '4GB' }, { key: 'Storage', value: '128GB' }],
    tags: ['deal-of-day'],
  },
  {
    name: 'Smart 20 | 4GB-64GB', slug: 'smart-20-4gb-64gb', sku: 'MOB-SMART-20-464',
    categorySlug: 'mobiles', brandSlug: 'infinix', cashPriceRs: 24999,
    description: 'Entry-level companion with a huge 5200mAh battery — two days of use on a single charge.',
    highlights: ['5200mAh Battery', '8MP Camera', 'Android 15 Go'],
    specs: [{ key: 'RAM', value: '4GB' }, { key: 'Storage', value: '64GB' }],
  },
  {
    name: 'Y05 | 4GB-128GB', slug: 'y05-4gb-128gb', sku: 'MOB-Y05-4128',
    categorySlug: 'mobiles', brandSlug: 'vivo', cashPriceRs: 36999,
    description: 'Stylish daily driver with a waterdrop display and a 13MP portrait camera.',
    highlights: ['6.51" Display', '13MP Camera', '5000mAh Battery'],
    specs: [{ key: 'RAM', value: '4GB' }, { key: 'Storage', value: '128GB' }],
  },
  {
    name: 'A200+ | 3GB-128GB', slug: 'a200-plus-3gb-128gb', sku: 'MOB-A200P-3128',
    categorySlug: 'mobiles', brandSlug: 'itel', cashPriceRs: 21999,
    description: 'Ultra-affordable smartphone for calls, WhatsApp and YouTube — simple and solid.',
    highlights: ['6.6" Display', '8MP Camera', '4000mAh Battery'],
    specs: [{ key: 'RAM', value: '3GB' }, { key: 'Storage', value: '128GB' }],
  },
  // --- Laptops ---
  {
    name: 'ProBook 450 G10 | i7-13th Gen | 16GB | 512GB SSD', slug: 'probook-450-g10', sku: 'LAP-PB450-G10',
    categorySlug: 'laptops', brandSlug: 'hp', cashPriceRs: 245000,
    description: 'Business-class 15.6" laptop with a backlit keyboard, fingerprint reader and all-day battery — ideal for office and study.',
    highlights: ['Core i7 13th Gen', '16GB RAM / 512GB NVMe', '15.6" FHD IPS', 'Backlit Keyboard'],
    specs: [{ key: 'Processor', value: 'Intel Core i7-1355U' }, { key: 'RAM', value: '16GB DDR4' }, { key: 'Storage', value: '512GB NVMe SSD' }, { key: 'Display', value: '15.6" FHD IPS' }],
  },
  {
    name: 'Latitude 5420 | i5-11th Gen | 16GB | 256GB SSD', slug: 'latitude-5420', sku: 'LAP-DL5420-I5',
    categorySlug: 'laptops', brandSlug: 'dell', cashPriceRs: 168000,
    description: 'Compact 14" business laptop, rebuilt and certified — great for developers and students on a budget.',
    highlights: ['Core i5 11th Gen', '16GB RAM / 256GB SSD', '14" FHD'],
    specs: [{ key: 'Processor', value: 'Intel Core i5-1145G7' }, { key: 'RAM', value: '16GB' }, { key: 'Storage', value: '256GB NVMe' }],
    tags: ['deal-of-day'],
  },
  {
    name: 'ThinkPad E14 Gen 4 | i5-12th Gen | 8GB | 512GB SSD', slug: 'thinkpad-e14-gen4', sku: 'LAP-TP-E14-G4',
    categorySlug: 'laptops', brandSlug: 'lenovo', cashPriceRs: 195000,
    description: 'Legendary ThinkPad keyboard, MIL-spec durability and a crisp 14" anti-glare display.',
    highlights: ['Core i5 12th Gen', '8GB / 512GB SSD', 'MIL-SPEC Tested'],
    specs: [{ key: 'Processor', value: 'Intel Core i5-1235U' }, { key: 'RAM', value: '8GB' }, { key: 'Storage', value: '512GB NVMe' }],
  },
  // --- LED TV ---
  {
    name: '43" 4K Google TV | UHD Smart LED', slug: '43-4k-google-tv', sku: 'TV-43-4K-GT',
    categorySlug: 'led-tv', brandSlug: 'dawlance', cashPriceRs: 74999,
    description: '43-inch 4K UHD smart TV with built-in Google TV, Chromecast and dual-band Wi-Fi.',
    highlights: ['4K UHD Panel', 'Google TV + Chromecast', '2 x HDMI / 1 x USB'],
    specs: [{ key: 'Size', value: '43 inch' }, { key: 'Resolution', value: '3840 x 2160' }],
    tags: ['deal-of-day'],
  },
  {
    name: '32" HD Google TV | Smart LED', slug: '32-hd-google-tv', sku: 'TV-32-HD-GT',
    categorySlug: 'led-tv', brandSlug: 'haier', cashPriceRs: 42999,
    description: 'Compact smart TV for bedrooms and hostels — Netflix, YouTube and live TV out of the box.',
    highlights: ['HD Ready', 'Google TV', 'Voice Remote'],
    specs: [{ key: 'Size', value: '32 inch' }, { key: 'Resolution', value: '1366 x 768' }],
  },
  // --- Refrigerator ---
  {
    name: '9140 WB Avante | 8 CF Refrigerator', slug: '9140-wb-avante-8cf', sku: 'REF-9140WB-8',
    categorySlug: 'refrigerator', brandSlug: 'dawlance', cashPriceRs: 108999,
    description: '8 cubic feet direct-cool refrigerator with a generous vegetable crisper and low-noise compressor.',
    highlights: ['8 CF Capacity', 'Low Noise Compressor', '10 Year Compressor Warranty'],
    specs: [{ key: 'Capacity', value: '8 CF' }, { key: 'Type', value: 'Direct Cool' }],
  },
  {
    name: 'Life Pro PRLP-2350 | 9 CF Refrigerator', slug: 'life-pro-prlp-2350', sku: 'REF-PRLP-2350',
    categorySlug: 'refrigerator', brandSlug: 'pel', cashPriceRs: 119999,
    description: '9 CF refrigerator with adjustable shelves, fast-freeze compartment and durable hinges.',
    highlights: ['9 CF Capacity', 'Fast Freeze', 'Adjustable Shelves'],
    specs: [{ key: 'Capacity', value: '9 CF' }],
  },
  // --- Washing Machine ---
  {
    name: 'HWM 130-1217 | 12 KG Washing Machine', slug: 'hwm-130-1217', sku: 'WM-HWM130-12',
    categorySlug: 'washing-machine', brandSlug: 'haier', cashPriceRs: 68999,
    description: '12 kg fully automatic top-load washer with fuzzy logic and a quick-wash cycle.',
    highlights: ['12 KG Capacity', 'Fuzzy Logic Control', 'Quick Wash'],
    specs: [{ key: 'Capacity', value: '12 KG' }, { key: 'Type', value: 'Top Load Automatic' }],
  },
  {
    name: 'DW 6550 Glass Lid | 8 KG Twin Tub', slug: 'dw-6550-glass-lid-8kg', sku: 'WM-DW6550-8',
    categorySlug: 'washing-machine', brandSlug: 'dawlance', cashPriceRs: 46999,
    description: '8 kg semi-automatic twin tub with a scratch-resistant glass lid and powerful wash motor.',
    highlights: ['8 KG Capacity', 'Twin Tub Semi-Auto', 'Glass Lid'],
    specs: [{ key: 'Capacity', value: '8 KG' }],
  },
  // --- AC ---
  {
    name: 'Frost 20 | 1.25 Ton Inverter Split AC (Cool Only)', slug: 'frost-20-125-ton-inverter', sku: 'AC-FROST20-125',
    categorySlug: 'air-conditioner', brandSlug: 'dawlance', cashPriceRs: 189999,
    description: '1.25 ton inverter split AC with copper coils, turbo cooling and a low-voltage startup of 150V.',
    highlights: ['1.25 Ton Inverter', 'Copper Condenser', '150V Startup'],
    specs: [{ key: 'Capacity', value: '1.25 Ton' }, { key: 'Type', value: 'Inverter Split' }],
    tags: ['deal-of-day'],
  },
  {
    name: 'PINV ATOM 12K | 1.0 Ton Inverter Split AC (Heat & Cool)', slug: 'pinv-atom-12k', sku: 'AC-ATOM12K',
    categorySlug: 'air-conditioner', brandSlug: 'pel', cashPriceRs: 179999,
    description: '1.0 ton heat & cool inverter AC for year-round comfort with self-cleaning filters.',
    highlights: ['1.0 Ton Inverter', 'Heat & Cool', 'Self Cleaning Filter'],
    specs: [{ key: 'Capacity', value: '1.0 Ton' }],
  },
  // --- Bikes ---
  {
    name: 'Roadster 70 | 70CC Motorbike', slug: 'roadster-70', sku: 'BIKE-RD70',
    categorySlug: 'bikes', brandSlug: 'superpower', cashPriceRs: 139000,
    description: 'Fuel-efficient 70cc commuter bike with electric start, disk front brake and a comfortable seat.',
    highlights: ['70CC Engine', 'Electric Start', '55+ KM/L'],
    specs: [{ key: 'Engine', value: '70CC' }, { key: 'Mileage', value: '55+ KM/L' }],
  },
  {
    name: 'Roadster 100 | 100CC Motorbike', slug: 'roadster-100', sku: 'BIKE-RD100',
    categorySlug: 'bikes', brandSlug: 'superpower', cashPriceRs: 179000,
    description: '100cc commuter with alloy rims and a smooth 4-speed gearbox for daily office runs.',
    highlights: ['100CC Engine', 'Alloy Rims', 'Electric Start'],
    specs: [{ key: 'Engine', value: '100CC' }],
  },
  // --- Solar ---
  {
    name: '5KW On-Grid Solar System | Panels + Inverter + Installation', slug: '5kw-on-grid-solar-system', sku: 'SOL-5KW-GRID',
    categorySlug: 'solar', brandSlug: 'pel', cashPriceRs: 925000,
    description: 'Complete 5KW on-grid solar solution: A-grade panels, hybrid-ready inverter, structure and professional installation.',
    highlights: ['5KW Capacity', 'A-Grade Panels', 'Installation Included', 'Net Metering Ready'],
    specs: [{ key: 'Capacity', value: '5 KW' }, { key: 'Type', value: 'On-Grid' }],
  },
  // --- Tablet ---
  {
    name: 'Tab A9 | 4GB-64GB', slug: 'tab-a9', sku: 'TAB-A9-464',
    categorySlug: 'tablet', brandSlug: 'samsung', cashPriceRs: 54999,
    description: '8.7" tablet for online classes, notes and Netflix — with quad speakers and a big battery.',
    highlights: ['8.7" Display', 'Quad Speakers', '7040mAh Battery'],
    specs: [{ key: 'RAM', value: '4GB' }, { key: 'Storage', value: '64GB' }],
  },
];

/** Build installment plans from a cash price (paisa) — mirrors the engine's minimum-advance rule. */
export function plansFor(cashPricePaisa: number) {
  const mk = (term: number, advanceFactor: number, markupFactor: number) => {
    const advance = Math.round((cashPricePaisa * advanceFactor) / 100) * 100;
    const total = Math.round((cashPricePaisa * (1 + markupFactor)) / 100) * 100;
    const monthly = Math.round((total - advance) / term / 100) * 100;
    return { term, advance, monthly, isActive: true, sortOrder: term };
  };
  return [mk(6, 0.25, 0.14), mk(12, 0.3, 0.22), mk(18, 0.35, 0.3)];
}

// ---------------------------------------------------------------------------
// CMS pages (all original copy)
// ---------------------------------------------------------------------------
export const cmsPages = [
  {
    slug: 'about-us',
    title: 'About Qist Store',
    subtitle: 'Making essentials affordable — one easy installment at a time.',
    template: 'about' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'Qist Store is a Buy-Now-Pay-Later marketplace built for Pakistani families. We believe nobody should delay a needed purchase because of a large upfront cost. Our platform splits the payment into a small advance and predictable monthly installments — with zero hidden charges.' },
      { type: 'stats' as const, items: [
        { title: '1,000+', body: 'Products on installment' },
        { title: '17', body: 'Cities covered' },
        { title: '48 hrs', body: 'Typical verification time' },
        { title: '100%', body: 'Transparent pricing' },
      ] },
      { type: 'heading' as const, title: 'Our Vision' },
      { type: 'paragraph' as const, body: 'A Pakistan where every household can access quality products with dignity — no pressure, no surprises, just a clear plan.' },
      { type: 'heading' as const, title: 'Our Mission' },
      { type: 'paragraph' as const, body: 'To make everyday essentials affordable through simple, transparent and fair installment plans, backed by honest customer service.' },
    ],
  },
  {
    slug: 'faqs',
    title: 'Frequently Asked Questions',
    subtitle: 'Everything about installments, orders, payments and support.',
    template: 'faq' as const,
    blocks: [
      { type: 'faq' as const, items: [
        { title: 'Who can apply for an installment plan?', body: 'Any Pakistani citizen with a valid CNIC can apply. You will need two guarantors who own a home or run a business.' },
        { title: 'How does the verification process work?', body: 'After you place an order, our team calls you within 24 hours. A representative collects CNIC copies (yours and your guarantors) and gets a form signed. The process completes within 48 hours.' },
        { title: 'How do I pay my monthly installment?', body: 'Pay from your JazzCash or EasyPaisa wallet by searching for Qist Store and entering your consumer ID. Bank transfer and cheques are also accepted.' },
        { title: 'Can I pay early or clear my plan sooner?', body: 'Yes. Early repayment is allowed at any time with no penalty.' },
        { title: 'Can I cancel my order?', body: 'Orders can be changed or cancelled only before verification. After verification is complete the order is locked.' },
        { title: 'Is there any documentation charge?', body: 'No. There are zero documentation charges and no hidden fees — the total payable amount you see at checkout is what you pay.' },
        { title: 'What warranty do products carry?', body: 'Most electronics carry the brand\'s company warranty. Warranty cards are provided at delivery.' },
      ] },
    ],
  },
  {
    slug: 'verification-process',
    title: 'Verification Process',
    subtitle: 'Simple, fast and respectful — four steps, done in 48 hours.',
    template: 'verification' as const,
    blocks: [
      { type: 'steps' as const, items: [
        { title: 'Order placed', body: 'Our representative calls you within 24 hours to confirm your order.', bodyUrdu: 'آپ کے آرڈر کرنے کے بعد ہمارا نمائندہ 24 گھنٹے کے اندر آپ سے رابطہ کرے گا۔' },
        { title: 'Verification visit', body: 'We collect a copy of your CNIC and the CNICs of two guarantors, and get a simple form signed.', bodyUrdu: 'ہمارا نمائندہ آپ کی اور دو ضمانتیوں کی شناختی کارڈ کی کاپی لے گا اور فارم پر دستخط کروائے گا۔' },
        { title: 'Guarantors', body: 'A guarantor can be a neighbour, friend or relative who owns a home or business.', bodyUrdu: 'ضمانتی کوئی بھی ہو سکتا ہے — پڑوسی، دوست یا رشتہ دار — جس کا اپنا گھر یا کاروبار ہو۔' },
        { title: 'Approval & delivery', body: 'Verification completes within 48 hours and your product is delivered within 3 business days.', bodyUrdu: 'یہ پورا عمل 48 گھنٹوں میں مکمل ہوتا ہے اور 3 کاروباری دنوں میں ڈیلیوری ہو جاتی ہے۔' },
      ] },
    ],
  },
  {
    slug: 'payment-method',
    title: 'Payment Methods',
    subtitle: 'Pay your installments from your mobile wallet — no bank account needed.',
    template: 'payment' as const,
    blocks: [
      { type: 'heading' as const, title: 'EasyPaisa' },
      { type: 'steps' as const, items: [
        { title: 'Open your EasyPaisa app', body: 'Log in to your EasyPaisa account.' },
        { title: 'Search for Qist Store', body: 'Tap the search icon and type Qist Store.' },
        { title: 'Enter your Consumer ID', body: 'Your Consumer ID is printed on your agreement and in your account dashboard.' },
        { title: 'Confirm payment', body: 'Review the amount and tap Pay. You receive an instant confirmation SMS.' },
      ] },
      { type: 'heading' as const, title: 'JazzCash' },
      { type: 'steps' as const, items: [
        { title: 'Open your JazzCash app', body: 'Log in to your JazzCash account.' },
        { title: 'Search for Qist Store', body: 'Use the bill-pay search to find Qist Store.' },
        { title: 'Enter your Consumer ID', body: 'Enter the Consumer ID from your agreement.' },
        { title: 'Confirm payment', body: 'Tap Pay Now — the installment is marked paid within minutes.' },
      ] },
    ],
  },
  {
    slug: 'delivery-policy',
    title: 'Delivery Policy',
    subtitle: 'Free delivery nationwide, 3–5 business days after approval.',
    template: 'policy' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'Delivery is FREE on all orders across Pakistan. After verification approval, orders are dispatched within 1 business day and delivered within 3–5 business days depending on your city. Selected products in Karachi, Lahore and Hyderabad qualify for same-day instant delivery.' },
      { type: 'paragraph' as const, body: 'You will receive SMS updates at every step: dispatch, out-for-delivery and delivered.' },
    ],
  },
  {
    slug: 'refund-return-policy',
    title: 'Refund & Return Policy',
    subtitle: 'Seven-day replacement on manufacturing defects.',
    template: 'policy' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'Products carrying manufacturing defects can be reported within 7 days of delivery for a replacement of the same product. Opened sealed-box items are eligible for replacement only if found defective on first use. Refunds, where applicable, are processed within 10 working days after the returned product passes inspection.' },
    ],
  },
  {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    subtitle: 'The agreement between you and Qist Store.',
    template: 'policy' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'By placing an order on Qist Store you agree to our installment terms: the advance payment is due at checkout, monthly installments are due on the dates in your schedule, and delivery occurs only after verification approval. Defaulting on three consecutive installments may result in product recovery and service suspension. Full legal terms are provided on your signed agreement.' },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    subtitle: 'Your data stays yours.',
    template: 'policy' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'We collect only the data needed to process your order: name, phone, delivery address and CNIC details for verification. Documents are encrypted at rest and are never shared with third parties except for legally required verification. You may request deletion of your data by writing to privacy@qiststore.pk.' },
    ],
  },
  {
    slug: 'musawamah-agreement',
    title: 'Musawamah Agreement',
    subtitle: 'Shariah-compliant sale — cost-plus, interest-free structure.',
    template: 'policy' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'Qist Store operates on the Musawamah model: the product is sold to you at an agreed total price (cash price plus a disclosed profit margin), payable in fixed installments. There is no interest-bearing loan, no late-fee compounding and no hidden charges. The total payable amount is fixed at the time of order and never changes.' },
    ],
  },
  {
    slug: 'become-vendor',
    title: 'Become a Vendor',
    subtitle: 'Sell on Qist Store. Reach customers across Pakistan.',
    template: 'become-vendor' as const,
    blocks: [
      { type: 'paragraph' as const, body: 'Join our growing marketplace and sell to customers who buy on installments. Qist Store handles credit risk, verification and installment collection — you get paid in full on a scheduled settlement cycle.' },
      { type: 'steps' as const, items: [
        { title: 'Register your business', body: 'Send your business name, CNIC and contact details to vendors@qiststore.pk. Approval takes under 24 hours.' },
        { title: 'Submit documents', body: 'Upload your CNIC copy, business registration (if any) and bank account details for payouts.' },
        { title: 'List your products', body: 'Add products with prices, images and stock. Our team helps with catalogue setup.' },
        { title: 'Ship & get paid', body: 'Confirm and dispatch orders. Payments are released on your settlement cycle.' },
      ] },
      { type: 'paragraph' as const, body: 'Requirements: valid CNIC, an active Pakistani bank account, and at least 5 SKUs ready to list.' },
    ],
  },
];

export const branches = [
  { name: 'Head Office', city: 'Karachi', address: 'Plot 13-C, 10th Street, DHA Phase 5, Stadium Commercial Area, Karachi', phone: '111-115-566' },
  { name: 'Saddar Regal', city: 'Karachi', address: 'Shop G-9, Regal Trade Square, Saddar, Karachi' },
  { name: 'Gulshan-e-Iqbal', city: 'Karachi', address: 'Shop A-80, Rabia Palace, Block 10-A, Gulshan-e-Iqbal, Karachi' },
  { name: 'North Nazimabad', city: 'Karachi', address: 'Euro Hi-Tech Residency, Block F, North Nazimabad, Karachi' },
  { name: 'Bahria Town', city: 'Karachi', address: 'Shop 41, AQ Supermarket, Bahria Town, Karachi' },
  { name: 'Faisal Town', city: 'Lahore', address: '1st Floor, 902-B Faisal Town, Main Shoukat Ali Road, Lahore' },
  { name: 'Shadman', city: 'Lahore', address: 'Shop 10, Umer Din Road, Shadbagh, Lahore' },
  { name: 'Raiwind Road', city: 'Lahore', address: 'Raiwind Road, Block B, Thokar Niazbeg, Lahore' },
  { name: 'G-10 Markaz', city: 'Islamabad', address: 'Baila Road, near Family Cash & Carry, G-10 Markaz, Islamabad' },
  { name: 'Saddar', city: 'Rawalpindi', address: 'First Floor, Niazi Plaza, Bank Road, Saddar, Rawalpindi' },
  { name: 'Latifabad', city: 'Hyderabad', address: 'Unit 7, Haseen Plaza, Latifabad, Hyderabad' },
  { name: 'GT Road', city: 'Gujranwala', address: 'GT Road, near Tariq Electronics, Gujranwala' },
];

export const blogs = [
  {
    slug: 'how-installments-help-families-plan-monthly-budget',
    title: 'How Installments Help Families Plan a Monthly Budget',
    excerpt: 'A practical look at how fixed monthly payments make big purchases predictable.',
    body: 'Big-ticket purchases — a refrigerator, a laptop for online classes, a summer AC — rarely fit into one month\'s salary. Fixed installment plans turn an unpredictable lump sum into a known line item in your monthly budget.\n\nThe rule of thumb: keep total monthly installments under 25% of take-home income, keep an emergency buffer, and always confirm the total payable amount before signing. At Qist Store the total is fixed at order time — it never changes, so your budget never surprises you.',
    tags: ['budgeting', 'guides'],
  },
  {
    slug: 'buying-a-laptop-for-online-classes-what-specs-matter',
    title: 'Buying a Laptop for Online Classes: What Specs Actually Matter',
    excerpt: 'RAM vs storage vs screen size — what a student really needs in 2026.',
    body: 'For video classes and research, an Core i5 (8th gen or newer), 8GB RAM and a 256GB SSD is the sweet spot. Skip dedicated graphics unless the course requires CAD or video editing — you will pay more for nothing.\n\nScreen size is comfort: 14" is portable, 15.6" is easier for long sessions. And always prefer SSD over HDD: it is the single biggest speed difference you will feel every day.',
    tags: ['laptops', 'guides'],
  },
  {
    slug: 'qiststore-launches-instant-delivery-in-karachi-lahore-hyderabad',
    title: 'Qist Store Launches Instant Delivery in Karachi, Lahore & Hyderabad',
    excerpt: 'Selected in-stock products now deliver the same day in three cities.',
    body: 'We are rolling out same-day instant delivery for selected in-stock products in Karachi, Lahore and Hyderabad. Look for the "Instant Delivery" badge on product pages. Verification-approved orders placed before 2 PM are dispatched the same day.',
    tags: ['news'],
    type: 'press' as const,
  },
];

export const vendors = [
  { businessName: 'Prime Traders', slug: 'prime-traders', address: 'Regal Trade Square, Saddar, Karachi', about: 'Laptops, computers and accessories with nationwide warranty support.', approvedBadges: ['Approved Seller'] },
  { businessName: 'Core Energy Solutions', slug: 'core-energy-solutions', address: 'Star City Mall, Saddar, Karachi', about: 'Solar systems, inverters and lithium batteries with installation.', approvedBadges: ['Solar Partner'] },
  { businessName: 'ALM Traders', slug: 'alm-traders', address: 'Hafeez Centre, Gulberg, Lahore', about: 'Mobile phones and tablets from all major brands.', approvedBadges: ['Approved Seller'] },
];
