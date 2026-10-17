/**
 * Admin API — everything the dashboard needs.
 *
 * Every route below is mounted at /api/v1/admin and is protected by
 * requireAuth + requireRole('admin', 'staff'). Role changes are restricted to
 * full admins. Money is always exchanged in PAISA (integer), matching the rest
 * of the API; the dashboard converts rupees → paisa at the form boundary.
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../../models/Product.js';
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { Brand, Category } from '../../models/Category.js';
import { ok, paginationMeta } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import {
  allowedTransitions,
  assertTransition,
  computePlan,
  isTerm,
  ORDER_STATUSES,
  type OrderStatus,
  type Term,
} from '../engine/installment.js';
import { slugify, uniqueSlug } from '../../utils/slug.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin', 'staff'));

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function objectId(value: string | null | undefined, field: string): string | null {
  if (!value) return null;
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(`Invalid ${field}`);
  return value;
}

function conflictFromDuplicate(error: unknown): never {
  const code = (error as { code?: number }).code;
  if (code === 11000) {
    const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0] ?? 'field';
    throw ApiError.conflict(`A record with this ${key} already exists`);
  }
  throw error;
}

/** Accept a transition or answer with a 409 (not a 500). */
function applyTransition(from: OrderStatus, to: OrderStatus): void {
  try {
    assertTransition(from, to);
  } catch {
    throw ApiError.conflict(`Cannot move order from ${from} to ${to}`);
  }
}

function rupeeLakhs(paisa: number): number {
  return Math.round(paisa / 100);
}

// ---------------------------------------------------------------------------
// GET /stats — dashboard KPIs, 14-day trend, status split, inventory alerts
// ---------------------------------------------------------------------------
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - 13);

    const [ordersTotal, statusRows, customerTotal, newCustomers, productTotal, activeProducts, lowStock, recentOrders, topProducts, salesRows] =
      await Promise.all([
        Order.countDocuments(),
        Order.aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'customer', createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
        Product.countDocuments(),
        Product.countDocuments({ status: 'active' }),
        Product.find({ status: 'active', 'stock.qty': { $lte: 5 } })
          .sort({ 'stock.qty': 1 })
          .limit(6)
          .select('name slug images stock minAdvance')
          .lean(),
        Order.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .select('orderNumber status customer pricing items createdAt verification.status')
          .lean(),
        Product.find({ status: 'active' })
          .sort({ soldCount: -1 })
          .limit(5)
          .select('name slug images soldCount minAdvance ratingStats')
          .lean(),
        Order.aggregate<{ _id: string; orders: number; advance: number; value: number }>([
          { $match: { createdAt: { $gte: dayStart } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              orders: { $sum: 1 },
              advance: { $sum: '$pricing.totalAdvance' },
              value: { $sum: '$pricing.totalPayable' },
            },
          },
        ]),
      ]);

    const statusCounts: Record<string, number> = {};
    for (const row of statusRows) statusCounts[row._id] = row.count;

    // Revenue is counted only on orders that survived verification, so a
    // rejected/cancelled order never inflates the dashboard.
    const revenueRows = await Order.aggregate<{ advance: number; receivable: number; count: number }>([
      {
        $match: {
          status: { $in: ['approved', 'processing', 'shipped', 'delivered', 'completed'] },
        },
      },
      {
        $group: {
          _id: null,
          advance: { $sum: '$pricing.totalAdvance' },
          receivable: { $sum: '$pricing.totalMonthlyPerMonth' },
          count: { $sum: 1 },
        },
      },
    ]);
    const revenue = revenueRows[0] ?? { advance: 0, receivable: 0, count: 0 };

    const series: { date: string; orders: number; advance: number }[] = [];
    const salesByDay = new Map(salesRows.map((r) => [r._id, r]));
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const row = salesByDay.get(key);
      series.push({ date: key, orders: row?.orders ?? 0, advance: row?.advance ?? 0 });
    }

    ok(res, {
      totals: {
        orders: ordersTotal,
        revenue: revenue.advance,
        monthlyReceivable: revenue.receivable,
        averageOrderValue: revenue.count > 0 ? Math.round(revenue.advance / revenue.count) : 0,
        customers: customerTotal,
        newCustomers30d: newCustomers,
        products: productTotal,
        activeProducts,
      },
      pendingVerification:
        (statusCounts.pending_verification ?? 0) + (statusCounts.verification_in_progress ?? 0),
      statusCounts,
      lowStockCount: await Product.countDocuments({ status: 'active', 'stock.qty': { $lte: 5 } }),
      salesSeries: series,
      recentOrders,
      topProducts,
      lowStock,
      generatedAt: new Date(),
    });
  }),
);

// ---------------------------------------------------------------------------
// Products — CRUD, filtering, inventory, archive / permanent delete
// ---------------------------------------------------------------------------
const planInput = z.object({
  term: z.number().int().refine(isTerm, 'Term must be 3, 6, 9, 12, 18 or 24 months'),
  advance: z.number().int().min(0),
  monthly: z.number().int().min(1),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const imageInput = z.object({
  url: z.string().url(),
  alt: z.string().default(''),
  sort: z.number().int().default(0),
});

const productInput = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().optional(),
  sku: z.string().max(60).optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  vendorName: z.string().optional(),
  description: z.string().default(''),
  highlights: z.array(z.string()).default([]),
  specs: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  images: z.array(imageInput).default([]),
  cashPrice: z.number().int().min(1),
  plans: z.array(planInput).default([]),
  stock: z
    .object({
      qty: z.number().int().min(0).default(0),
      track: z.boolean().default(true),
      status: z.enum(['in_stock', 'out_of_stock', 'pre_order']).default('in_stock'),
    })
    .default({ qty: 0, track: true, status: 'in_stock' }),
  tags: z.array(z.enum(['deal-of-day', 'special-offer', 'instant-delivery', 'featured'])).default([]),
  status: z.enum(['draft', 'active', 'inactive']).default('active'),
  featured: z.boolean().default(false),
  warranty: z.enum(['company', 'seller']).default('company'),
  delivery: z
    .object({ free: z.boolean().default(true), instantCities: z.array(z.string()).default([]) })
    .default({ free: true, instantCities: [] }),
  seo: z
    .object({ title: z.string().default(''), description: z.string().default('') })
    .default({ title: '', description: '' }),
});

/**
 * Update schema is deliberately separate from the create schema: create has
 * defaults (empty arrays etc.) that must NOT be re-applied on a partial PATCH,
 * otherwise editing one field would wipe plans/images/tags.
 */
const productUpdateInput = z.object({
  name: z.string().min(2).max(160).optional(),
  slug: z.string().optional(),
  sku: z.string().max(60).optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  vendorName: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  specs: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  images: z.array(imageInput).optional(),
  cashPrice: z.number().int().min(1).optional(),
  plans: z.array(planInput).optional(),
  stock: z
    .object({
      qty: z.number().int().min(0),
      track: z.boolean(),
      status: z.enum(['in_stock', 'out_of_stock', 'pre_order']),
    })
    .optional(),
  tags: z.array(z.enum(['deal-of-day', 'special-offer', 'instant-delivery', 'featured'])).optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
  featured: z.boolean().optional(),
  warranty: z.enum(['company', 'seller']).optional(),
  delivery: z.object({ free: z.boolean(), instantCities: z.array(z.string()) }).optional(),
  seo: z.object({ title: z.string(), description: z.string() }).optional(),
});

/** Validate every plan with the shared engine and derive minAdvance. */
function pricePlans(cashPrice: number, plans: z.infer<typeof planInput>[]) {
  const priced = plans.map((plan) => {
    try {
      const computed = computePlan(cashPrice, {
        term: plan.term as Term,
        advance: plan.advance,
        monthly: plan.monthly,
      });
      return { ...plan, totalPayable: computed.totalPayable };
    } catch (error) {
      throw ApiError.badRequest((error as Error).message);
    }
  });
  return {
    plans: priced,
    minAdvance: priced.length ? Math.min(...priced.map((p) => p.advance)) : 0,
  };
}

async function resolveRefs(input: { category?: string | null; brand?: string | null }) {
  const refs: { category?: string | null; brand?: string | null } = {};
  if ('category' in input) refs.category = objectId(input.category, 'category');
  if ('brand' in input) refs.brand = objectId(input.brand, 'brand');
  if (refs.category) {
    const exists = await Category.exists({ _id: refs.category });
    if (!exists) throw ApiError.badRequest('Category not found');
  }
  if (refs.brand) {
    const exists = await Brand.exists({ _id: refs.brand });
    if (!exists) throw ApiError.badRequest('Brand not found');
  }
  return refs;
}

async function generateSku(slug: string): Promise<string> {
  const base = `QS-${slug.slice(0, 12).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
  if (!(await Product.exists({ sku: base }))) return base;
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    if (!(await Product.exists({ sku: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

adminRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'all');
    const category = String(req.query.category ?? '');
    const stockFilter = String(req.query.stock ?? '');
    const sort = String(req.query.sort ?? 'newest');

    const filter: Record<string, unknown> = {};
    if (status !== 'all') filter.status = status as never;
    if (category) {
      const cat = await Category.findOne({ slug: category }).select('_id').lean();
      if (!cat) throw ApiError.notFound('Category not found');
      const children = await Category.find({ parent: cat._id }).select('_id').lean();
      filter.category = { $in: [cat._id, ...children.map((c) => c._id)] };
    }
    if (stockFilter === 'low') filter['stock.qty'] = { $lte: 5 };
    if (stockFilter === 'out') filter['stock.qty'] = 0;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { sku: rx }, { slug: rx }, { vendorName: rx }];
    }

    const SORTS: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
      'price-asc': { cashPrice: 1 },
      'price-desc': { cashPrice: -1 },
      stock: { 'stock.qty': 1 },
      popular: { soldCount: -1 },
    };

    const [rows, total] = await Promise.all([
      Product.find(filter)
        .sort(SORTS[sort] ?? SORTS.newest!)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    ok(
      res,
      rows.map((p) => ({
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        imageUrl: p.images?.[0]?.url ?? '',
        cashPrice: p.cashPrice,
        minAdvance: p.minAdvance,
        stock: p.stock,
        status: p.status,
        featured: p.featured,
        tags: p.tags,
        plans: p.plans?.length ?? 0,
        soldCount: p.soldCount,
        category: p.category,
        brand: p.brand,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      paginationMeta(page, limit, total),
    );
  }),
);

adminRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const product = await Product.findOne(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .lean();
    if (!product) throw ApiError.notFound('Product not found');
    ok(res, {
      ...product,
      id: String(product._id),
      plans: (product.plans ?? []).map((plan) => ({
        ...plan,
        totalPayable: plan.advance + plan.monthly * plan.term,
      })),
    });
  }),
);

adminRouter.post(
  '/products',
  validate(productInput),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof productInput>;
    const refs = await resolveRefs({ category: body.category, brand: body.brand });
    const { plans, minAdvance } = pricePlans(body.cashPrice, body.plans);

    const slug = body.slug
      ? slugify(body.slug)
      : await uniqueSlug(body.name, async (candidate) => Boolean(await Product.exists({ slug: candidate })));
    if (body.slug && (await Product.exists({ slug }))) throw ApiError.conflict('A product with this slug already exists');

    if (body.sku && (await Product.exists({ sku: body.sku }))) {
      throw ApiError.conflict('A product with this SKU already exists');
    }

    try {
      const product = await Product.create({
        name: body.name,
        slug,
        sku: body.sku || (await generateSku(slug)),
        category: refs.category ?? null,
        brand: refs.brand ?? null,
        vendorName: body.vendorName ?? 'Qist Store Fulfilment',
        description: body.description,
        highlights: body.highlights,
        specs: body.specs,
        images: body.images,
        cashPrice: body.cashPrice,
        minAdvance,
        plans: plans as never,
        stock: body.stock,
        tags: body.tags,
        status: body.status,
        featured: body.featured,
        warranty: body.warranty,
        delivery: body.delivery,
        seo: body.seo,
      });
      res.status(201).json({ success: true, data: { id: String(product._id), slug: product.slug, sku: product.sku } });
    } catch (error) {
      conflictFromDuplicate(error);
    }
  }),
);

adminRouter.patch(
  '/products/:id',
  validate(productUpdateInput),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const product = await Product.findOne(filter);
    if (!product) throw ApiError.notFound('Product not found');

    const body = req.body as z.infer<typeof productUpdateInput>;
    const refs = await resolveRefs({
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.brand !== undefined ? { brand: body.brand } : {}),
    });

    if (body.slug && body.slug !== product.slug) {
      const slug = slugify(body.slug);
      if (await Product.exists({ slug, _id: { $ne: product._id } })) {
        throw ApiError.conflict('A product with this slug already exists');
      }
      product.slug = slug;
    }
    if (body.sku && body.sku !== product.sku) {
      if (await Product.exists({ sku: body.sku, _id: { $ne: product._id } })) {
        throw ApiError.conflict('A product with this SKU already exists');
      }
      product.sku = body.sku;
    }

    if (body.name !== undefined) product.name = body.name;
    if ('category' in refs) product.category = refs.category as never;
    if ('brand' in refs) product.brand = refs.brand as never;
    if (body.vendorName !== undefined) product.vendorName = body.vendorName;
    if (body.description !== undefined) product.description = body.description;
    if (body.highlights !== undefined) product.highlights = body.highlights;
    if (body.specs !== undefined) product.specs = body.specs as never;
    if (body.images !== undefined) product.images = body.images as never;
    if (body.tags !== undefined) product.tags = body.tags as never;
    if (body.status !== undefined) product.status = body.status;
    if (body.featured !== undefined) product.featured = body.featured;
    if (body.warranty !== undefined) product.warranty = body.warranty;
    if (body.delivery !== undefined) product.delivery = body.delivery as never;
    if (body.seo !== undefined) product.seo = body.seo as never;
    if (body.stock !== undefined) product.stock = body.stock as never;

    if (body.cashPrice !== undefined) product.cashPrice = body.cashPrice;
    if (body.plans !== undefined || body.cashPrice !== undefined) {
      const cashPrice = body.cashPrice ?? product.cashPrice;
      const plans = body.plans ?? (product.plans ?? []).map((p) => ({
        term: p.term,
        advance: p.advance,
        monthly: p.monthly,
        isActive: p.isActive !== false,
        sortOrder: p.sortOrder,
      }));
      const priced = pricePlans(cashPrice, plans);
      product.plans = priced.plans as never;
      product.minAdvance = priced.minAdvance;
    }

    try {
      await product.save();
    } catch (error) {
      conflictFromDuplicate(error);
    }
    ok(res, { id: String(product._id), slug: product.slug, status: product.status });
  }),
);

/**
 * DELETE /products/:id
 * Default = archive (status: inactive) so storefront history/links survive.
 * ?permanent=true really deletes, but only when no order references the product.
 */
adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const product = await Product.findOne(filter).select('_id slug status').lean();
    if (!product) throw ApiError.notFound('Product not found');

    if (String(req.query.permanent) === 'true') {
      const used = await Order.countDocuments({ 'items.product': product._id });
      if (used > 0) {
        throw ApiError.conflict(
          `This product appears in ${used} order(s). Archive it instead of deleting to keep order history intact.`,
        );
      }
      await Product.deleteOne({ _id: product._id });
      ok(res, { deleted: true, permanent: true, slug: product.slug });
      return;
    }

    await Product.updateOne({ _id: product._id }, { $set: { status: 'inactive' } });
    ok(res, { archived: true, permanent: false, slug: product.slug });
  }),
);

/** PATCH /products/:id/stock — fast inline inventory edit from the table. */
adminRouter.patch(
  '/products/:id/stock',
  validate(
    z.object({
      qty: z.number().int().min(0),
      status: z.enum(['in_stock', 'out_of_stock', 'pre_order']).optional(),
      track: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const body = req.body as { qty: number; status?: string; track?: boolean };
    const id = String(req.params.id);
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const update: Record<string, unknown> = {
      'stock.qty': body.qty,
      'stock.status': body.status ?? (body.qty === 0 ? 'out_of_stock' : 'in_stock'),
    };
    if (body.track !== undefined) update['stock.track'] = body.track;
    const product = await Product.findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' })
      .select('name slug stock')
      .lean();
    if (!product) throw ApiError.notFound('Product not found');
    ok(res, { id: String(product._id), stock: product.stock });
  }),
);

// ---------------------------------------------------------------------------
// Reference data for product forms (categories tree + brands)
// ---------------------------------------------------------------------------
adminRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const cats = await Category.find().sort({ order: 1, name: 1 }).lean();
    const counts = await Product.aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countByCat = new Map(counts.map((c) => [String(c._id), c.count]));
    const byId = new Map(cats.map((c) => [String(c._id), c]));

    ok(
      res,
      cats.map((c) => ({
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        parent: c.parent ? String(c.parent) : null,
        parentName: c.parent ? (byId.get(String(c.parent))?.name ?? null) : null,
        icon: c.icon,
        isActive: c.isActive,
        order: c.order,
        productCount: countByCat.get(String(c._id)) ?? 0,
      })),
    );
  }),
);

adminRouter.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const brands = await Brand.find().sort({ name: 1 }).lean();
    ok(res, brands.map((b) => ({ id: String(b._id), name: b.name, slug: b.slug, logo: b.logo, isActive: b.isActive })));
  }),
);

// ---------------------------------------------------------------------------
// Orders — list, detail, status, verification, notes, installment payments
// ---------------------------------------------------------------------------
adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'all');
    const paymentMethod = String(req.query.paymentMethod ?? '');
    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    const sort = String(req.query.sort ?? 'newest');

    const base: Record<string, unknown> = {};
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      base.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
    }
    if (paymentMethod) base.paymentMethod = paymentMethod;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      base.createdAt = range;
    }

    const filter: Record<string, unknown> = { ...base };
    if (status !== 'all') filter.status = status;

    const SORTS: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'value-desc': { 'pricing.totalPayable': -1 },
      'advance-desc': { 'pricing.totalAdvance': -1 },
    };

    const [rows, total, statusRows] = await Promise.all([
      Order.find(filter)
        .sort(SORTS[sort] ?? SORTS.newest!)
        .skip(skip)
        .limit(limit)
        .select('orderNumber status customer pricing items paymentMethod verification.status createdAt user')
        .lean(),
      Order.countDocuments(filter),
      Order.aggregate<{ _id: string; count: number }>([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const statusCounts: Record<string, number> = { all: 0 };
    const allKey = 'all';
    for (const row of statusRows) {
      statusCounts[row._id] = row.count;
      statusCounts[allKey] = (statusCounts[allKey] ?? 0) + row.count;
    }

    ok(res, rows, { ...paginationMeta(page, limit, total), statusCounts });
  }),
);

/** GET /orders/export?status= — CSV stream for the admin table export button. */
adminRouter.get(
  '/orders/export.csv',
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? 'all');
    const filter: Record<string, unknown> = status === 'all' ? {} : { status };
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

    const header = [
      'Order Number',
      'Date',
      'Customer',
      'Phone',
      'Status',
      'Items',
      'Advance (PKR)',
      'Monthly (PKR)',
      'Total (PKR)',
      'Payment Method',
      'City',
    ];
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt?.toISOString(),
        o.customer?.name,
        o.customer?.phone,
        o.status,
        (o.items ?? []).map((i) => `${i.name} x${i.qty} (${i.term}m)`).join(' | '),
        rupeeLakhs(o.pricing?.totalAdvance ?? 0),
        rupeeLakhs(o.pricing?.totalMonthlyPerMonth ?? 0),
        rupeeLakhs(o.pricing?.totalPayable ?? 0),
        o.paymentMethod,
        o.shippingAddress?.city,
      ]
        .map(escape)
        .join(','),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="qist-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([header.map(escape).join(','), ...lines].join('\n'));
  }),
);

adminRouter.get(
  '/orders/:orderNumber',
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('user', 'name phone email role status verificationStatus createdAt')
      .populate('verification.reviewedBy', 'name phone')
      .lean();
    if (!order) throw ApiError.notFound('Order not found');

    const collected = (order.schedule ?? [])
      .filter((s) => s.status === 'paid')
      .reduce((sum, s) => sum + (s.paidAmount ?? s.amount), 0);

    ok(res, {
      ...order,
      allowedTransitions: allowedTransitions(order.status as OrderStatus),
      payments: {
        collected,
        remaining: (order.pricing?.totalPayable ?? 0) - (order.pricing?.totalAdvance ?? 0) - collected,
      },
    });
  }),
);

const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
});

adminRouter.patch(
  '/orders/:orderNumber/status',
  validate(statusUpdateSchema),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body as z.infer<typeof statusUpdateSchema>;
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) throw ApiError.notFound('Order not found');

    applyTransition(order.status as OrderStatus, status);
    order.status = status;
    order.timeline.push({ status, at: new Date(), note: note ?? '' });
    await order.save();
    ok(res, { orderNumber: order.orderNumber, status: order.status, allowedTransitions: allowedTransitions(status) });
  }),
);

const verificationDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional(),
});

adminRouter.patch(
  '/orders/:orderNumber/verification',
  validate(verificationDecisionSchema),
  asyncHandler(async (req, res) => {
    const { decision, reason } = req.body as z.infer<typeof verificationDecisionSchema>;
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) throw ApiError.notFound('Order not found');

    if (decision === 'rejected' && !reason?.trim()) {
      throw ApiError.badRequest('A rejection reason is required');
    }

    order.verification.status = decision;
    order.verification.reviewedBy = req.user!.sub as never;
    if (decision === 'approved') order.verification.approvedAt = new Date();
    if (reason) order.verification.rejectionReason = reason;

    const target: OrderStatus = decision === 'approved' ? 'approved' : 'rejected';
    applyTransition(order.status as OrderStatus, target);
    order.status = target;
    order.timeline.push({
      status: target,
      at: new Date(),
      note: decision === 'approved' ? 'Verification approved' : `Verification rejected: ${reason ?? 'n/a'}`,
    });
    await order.save();
    ok(res, {
      orderNumber: order.orderNumber,
      status: order.status,
      verification: order.verification.status,
      allowedTransitions: allowedTransitions(target),
    });
  }),
);

adminRouter.patch(
  '/orders/:orderNumber/notes',
  validate(z.object({ notes: z.string().max(2000) })),
  asyncHandler(async (req, res) => {
    const { notes } = req.body as { notes: string };
    const order = await Order.findOneAndUpdate(
      { orderNumber: req.params.orderNumber },
      { $set: { notes } },
      { returnDocument: 'after' },
    ).lean();
    if (!order) throw ApiError.notFound('Order not found');
    ok(res, { orderNumber: order.orderNumber, notes: order.notes });
  }),
);

const installmentSchema = z.object({
  status: z.enum(['upcoming', 'due', 'paid', 'partial', 'overdue', 'waived']),
  paidAmount: z.number().int().min(0).optional(),
  method: z.string().max(40).optional(),
  txnRef: z.string().max(80).optional(),
});

/** PATCH /orders/:orderNumber/schedule/:installmentNo — record a payment. */
adminRouter.patch(
  '/orders/:orderNumber/schedule/:installmentNo',
  validate(installmentSchema),
  asyncHandler(async (req, res) => {
    const installmentNo = Number.parseInt(String(req.params.installmentNo ?? ''), 10);
    if (!Number.isInteger(installmentNo) || installmentNo < 1) throw ApiError.badRequest('Invalid installment number');

    const body = req.body as z.infer<typeof installmentSchema>;
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) throw ApiError.notFound('Order not found');

    const entry = order.schedule.find((s) => s.installmentNo === installmentNo);
    if (!entry) throw ApiError.notFound('Installment not found on this order');

    if (body.status === 'paid') {
      entry.status = 'paid';
      entry.paidAmount = entry.amount;
      entry.paidAt = new Date();
    } else if (body.status === 'partial') {
      if (body.paidAmount == null || body.paidAmount <= 0 || body.paidAmount >= entry.amount) {
        throw ApiError.badRequest('paidAmount must be greater than 0 and less than the installment amount');
      }
      entry.status = 'partial';
      entry.paidAmount = body.paidAmount;
      entry.paidAt = new Date();
    } else {
      entry.status = body.status;
      entry.paidAmount = 0;
      entry.paidAt = undefined;
    }
    if (body.method) entry.method = body.method;
    if (body.txnRef) entry.txnRef = body.txnRef;

    order.timeline.push({
      status: order.status,
      at: new Date(),
      note: `Installment #${installmentNo} marked ${body.status}${body.paidAmount ? ` (${body.paidAmount})` : ''}`,
    });
    await order.save();

    ok(res, {
      orderNumber: order.orderNumber,
      installmentNo,
      status: entry.status,
      paidAmount: entry.paidAmount ?? 0,
    });
  }),
);

// ---------------------------------------------------------------------------
// Customers — list, profile with order history, block / role management
// ---------------------------------------------------------------------------
adminRouter.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '').trim();
    const status = String(req.query.status ?? 'all');

    const match: Record<string, unknown> = { role: { $in: ['customer', 'vendor'] } };
    if (status !== 'all') match.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const result = await User.aggregate<{
      rows: Record<string, unknown>[];
      total: { count: number }[];
    }>([
      { $match: match },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id', phone: '$phone' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ['$user', '$$uid'] }, { $eq: ['$customer.phone', '$$phone'] }],
                },
              },
            },
            { $project: { status: 1, createdAt: 1, 'pricing.totalAdvance': 1, 'pricing.totalPayable': 1 } },
          ],
          as: 'orderDocs',
        },
      },
      {
        $addFields: {
          ordersCount: { $size: '$orderDocs' },
          totalSpend: { $sum: '$orderDocs.pricing.totalAdvance' },
          totalContractValue: { $sum: '$orderDocs.pricing.totalPayable' },
          lastOrderAt: { $max: '$orderDocs.createdAt' },
        },
      },
      { $sort: { createdAt: -1 } },
      { $project: { passwordHash: 0, tokenVersion: 0, orderDocs: 0, failedLoginCount: 0, lockedUntil: 0 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const facet = result[0] ?? { rows: [], total: [] };
    const total = facet.total[0]?.count ?? 0;
    ok(
      res,
      facet.rows.map((u) => ({ ...u, id: String(u._id) })),
      paginationMeta(page, limit, total),
    );
  }),
);

adminRouter.get(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) throw ApiError.badRequest('Invalid customer id');
    const user = await User.findById(String(req.params.id))
      .select('-passwordHash -tokenVersion -failedLoginCount -lockedUntil')
      .lean();
    if (!user) throw ApiError.notFound('Customer not found');

    const orders = await Order.find({
      $or: [{ user: user._id }, { 'customer.phone': user.phone }],
    })
      .sort({ createdAt: -1 })
      .select('orderNumber status items pricing createdAt paymentMethod verification.status')
      .lean();

    ok(res, {
      customer: { ...user, id: String(user._id) },
      orders,
      stats: {
        orders: orders.length,
        totalAdvance: orders.reduce((sum, o) => sum + (o.pricing?.totalAdvance ?? 0), 0),
        totalContractValue: orders.reduce((sum, o) => sum + (o.pricing?.totalPayable ?? 0), 0),
        activeOrders: orders.filter(
          (o) => !['completed', 'cancelled', 'rejected', 'defaulted'].includes(o.status),
        ).length,
        lastOrderAt: orders[0]?.createdAt ?? null,
      },
    });
  }),
);

const customerUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'blocked', 'pending']).optional(),
  role: z.enum(['customer', 'vendor', 'admin', 'staff']).optional(),
});

adminRouter.patch(
  '/customers/:id',
  validate(customerUpdateSchema),
  asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) throw ApiError.badRequest('Invalid customer id');
    const body = req.body as z.infer<typeof customerUpdateSchema>;
    const user = await User.findById(String(req.params.id));
    if (!user) throw ApiError.notFound('Customer not found');

    if (String(user._id) === req.user!.sub) {
      if (body.status === 'blocked') throw ApiError.badRequest('You cannot block your own account');
      if (body.role && body.role !== user.role) throw ApiError.badRequest('You cannot change your own role');
    }
    if (body.role && body.role !== user.role && req.user!.role !== 'admin') {
      throw ApiError.forbidden('Only a full admin can change roles');
    }

    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.role !== undefined) user.role = body.role;
    if (body.status !== undefined) {
      user.status = body.status;
      // Blocking must kill existing refresh sessions immediately.
      if (body.status === 'blocked') user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      if (body.status === 'active') {
        user.lockedUntil = undefined;
        user.failedLoginCount = 0;
      }
    }

    try {
      await user.save();
    } catch (error) {
      conflictFromDuplicate(error);
    }
    ok(res, {
      id: String(user._id),
      name: user.name,
      email: user.email ?? '',
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
  }),
);

/** GET /me — lets the dashboard verify the signed-in staff member on load. */
adminRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.sub)
      .select('name email phone role status verificationStatus createdAt')
      .lean();
    if (!user) throw ApiError.notFound('User not found');
    if (user.status === 'blocked') throw ApiError.forbidden('Account blocked');
    ok(res, user);
  }),
);
