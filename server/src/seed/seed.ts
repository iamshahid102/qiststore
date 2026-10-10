import { connectDb, disconnectDb } from '../config/db.js';
import { Category, Brand } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Blog, Branch, CmsPage, Deal, HomeSection, Vendor } from '../models/Content.js';
import { User } from '../models/User.js';
import { slugify } from '../utils/slug.js';
import { rupeesToPaisa } from '../utils/money.js';
import { blogs, brands, categories, cmsPages, branches, products, plansFor, vendors } from './data.js';
import bcrypt from 'bcryptjs';

async function seed() {
  await connectDb();
  console.log('Seeding Qist Store demo data...');

  // Clean slate (demo DB only)
  await Promise.all([
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    CmsPage.deleteMany({}),
    Blog.deleteMany({}),
    Branch.deleteMany({}),
    Vendor.deleteMany({}),
    Deal.deleteMany({}),
    HomeSection.deleteMany({}),
    User.deleteMany({}),
  ]);

  // Categories (parent + children)
  const categoryBySlug = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const parent = await Category.create({
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      order: i,
      filters: c.filters ?? [],
      seo: {
        title: `${c.name} Price in Pakistan on Installment | Qist Store`,
        description: `Buy ${c.name} on easy monthly installments in Pakistan. Best prices, free delivery.`,
      },
    });
    categoryBySlug.set(c.slug, String(parent._id));
    for (const [j, ch] of (c.children ?? []).entries()) {
      const child = await Category.create({ name: ch.name, slug: ch.slug, parent: parent._id, order: j });
      categoryBySlug.set(ch.slug, String(child._id));
    }
  }

  // Brands
  const brandBySlug = new Map<string, string>();
  for (const b of brands) {
    const doc = await Brand.create({ name: b.name, slug: b.slug });
    brandBySlug.set(b.slug, String(doc._id));
  }

  // Vendors
  const vendorDocs = [];
  for (const v of vendors) {
    vendorDocs.push(await Vendor.create(v));
  }

  // Products
  let i = 0;
  for (const p of products) {
    const cashPrice = rupeesToPaisa(p.cashPriceRs);
    const plans = plansFor(cashPrice);
    await Product.create({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: categoryBySlug.get(p.categorySlug),
      brand: brandBySlug.get(p.brandSlug) ?? null,
      vendor: i % 5 === 0 && vendorDocs[i % vendorDocs.length] ? vendorDocs[i % vendorDocs.length]!._id : null,
      vendorName: i % 5 === 0 ? vendorDocs[i % vendorDocs.length]!.businessName : 'Qist Store Fulfilment',
      description: p.description,
      highlights: p.highlights,
      specs: p.specs,
      images: [],
      cashPrice,
      minAdvance: Math.min(...plans.map((pl) => pl.advance)),
      plans: plans as never,
      stock: { qty: 25, track: true, status: 'in_stock' },
      tags: p.tags ?? [],
      status: 'active',
      featured: i < 8,
      ratingStats: { avg: 4 + (i % 10) / 10, count: 12 + i * 3 },
      soldCount: 200 - i * 7,
      delivery: { free: true, instantCities: ['Karachi', 'Lahore', 'Hyderabad'] },
    });
    i++;
  }

  // CMS pages
  for (const page of cmsPages) await CmsPage.create(page);

  // Blogs / press
  for (const post of blogs) await Blog.create({ ...post, type: post.type ?? 'blog' });

  // Branches
  await Branch.insertMany(branches.map((b) => ({ ...b, hours: 'Mon-Sat, 11am-11pm' })));

  // Deal of the day: next 24h, tagged products
  const dealProducts = await Product.find({ tags: 'deal-of-day' }).select('_id').limit(8).lean();
  await Deal.create({
    title: 'Deals of the Day',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    products: dealProducts.map((p) => p._id),
    isActive: true,
  });

  // Home sections
  const railCategories = ['mobiles', 'laptops', 'led-tv', 'refrigerator', 'air-conditioner', 'washing-machine'];
  let order = 1;
  for (const slug of railCategories) {
    const catId = categoryBySlug.get(slug);
    if (!catId) continue;
    const cat = await Category.findById(catId);
    await HomeSection.create({
      key: slug,
      title: cat?.name ?? slugify(slug),
      category: catId,
      order: order++,
      limit: 8,
    });
  }

  // Demo users
  await User.create([
    { name: 'Admin User', phone: '03000000001', role: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10), isPhoneVerified: true },
    { name: 'Demo Customer', phone: '03000000002', role: 'customer', passwordHash: await bcrypt.hash('Customer@123', 10), isPhoneVerified: true },
  ]);

  const counts = {
    categories: await Category.countDocuments(),
    brands: await Brand.countDocuments(),
    products: await Product.countDocuments(),
    pages: await CmsPage.countDocuments(),
    blogs: await Blog.countDocuments(),
    branches: await Branch.countDocuments(),
    vendors: await Vendor.countDocuments(),
  };
  console.log('Seed complete:', counts);
  console.log('Demo logins -> admin: 03000000001 / Admin@123 | customer: 03000000002 / Customer@123');
  await disconnectDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
