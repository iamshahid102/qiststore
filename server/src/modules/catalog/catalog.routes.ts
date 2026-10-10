import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../../models/Category.js';
import { Brand } from '../../models/Category.js';
import { Product, type ProductDoc } from '../../models/Product.js';
import { Deal, HomeSection } from '../../models/Content.js';
import { ok, paginationMeta } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import { rupeesToPaisa } from '../../utils/money.js';

export const catalogRouter = Router();

// ---------------------------------------------------------------------------
// DTOs — the shapes the Next.js client consumes
// ---------------------------------------------------------------------------
export interface ProductSummaryDto {
  id: string;
  slug: string;
  name: string;
  cashPrice: number;
  minAdvance: number;
  imageUrl: string;
  brandName?: string;
  categorySlug?: string;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  stockStatus: string;
}

type LeanProduct = Record<string, unknown> & {
  _id: unknown;
  slug: string;
  name: string;
  cashPrice: number;
  minAdvance: number;
  images?: { url?: string }[];
  brand?: unknown;
  category?: unknown;
  ratingStats?: { avg?: number; count?: number };
  tags?: string[];
  stock?: { status?: string };
};

export function toSummary(p: LeanProduct): ProductSummaryDto {
  const brand = p.brand as { name?: string } | null | undefined;
  const category = p.category as { slug?: string } | null | undefined;
  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    cashPrice: p.cashPrice,
    minAdvance: p.minAdvance,
    imageUrl: p.images?.[0]?.url ?? '',
    brandName: brand && typeof brand === 'object' && 'name' in brand ? brand.name : undefined,
    categorySlug: category && typeof category === 'object' && 'slug' in category ? category.slug : undefined,
    ratingAvg: p.ratingStats?.avg ?? 0,
    ratingCount: p.ratingStats?.count ?? 0,
    tags: p.tags ?? [],
    stockStatus: p.stock?.status ?? 'in_stock',
  };
}

// ---------------------------------------------------------------------------
// GET /categories/tree — top-level categories with children
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/categories/tree',
  asyncHandler(async (_req, res) => {
    const cats = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
    const top = cats.filter((c) => !c.parent);
    const tree = top.map((c) => ({
      id: String(c._id),
      name: c.name,
      nameUrdu: c.nameUrdu ?? '',
      slug: c.slug,
      icon: c.icon ?? '',
      children: cats
        .filter((ch) => String(ch.parent) === String(c._id))
        .map((ch) => ({ id: String(ch._id), name: ch.name, slug: ch.slug, parentSlug: c.slug })),
    }));
    ok(res, tree);
  }),
);

// ---------------------------------------------------------------------------
// GET /brands?category=<slug>
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/brands',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { isActive: true };
    const categorySlug = req.query.category;
    if (typeof categorySlug === 'string' && categorySlug) {
      const cat = await Category.findOne({ slug: categorySlug });
      if (cat) filter.categories = cat._id;
    }
    const brands = await Brand.find(filter).sort({ name: 1 }).select('name slug logo').lean();
    ok(
      res,
      brands.map((b) => ({ id: String(b._id), name: b.name, slug: b.slug, logo: b.logo ?? '' })),
    );
  }),
);

// ---------------------------------------------------------------------------
// GET /products — filtering, sorting, pagination
// ---------------------------------------------------------------------------
const SORTS: Record<string, Record<string, 1 | -1>> = {
  'price-asc': { minAdvance: 1 },
  'price-desc': { minAdvance: -1 },
  newest: { createdAt: -1 },
  popular: { soldCount: -1 },
};

const productListQuery = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(), // rupees (client-friendly)
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['price-asc', 'price-desc', 'newest', 'popular']).default('popular'),
  tag: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

catalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const q = productListQuery.parse(req.query);
    const { page, limit, skip } = parsePagination(q as unknown as Record<string, unknown>);

    const filter: Record<string, unknown> = { status: 'active' };
    const and: Record<string, unknown>[] = [];

    if (q.category) {
      const cat = await Category.findOne({ slug: q.category });
      if (!cat) throw ApiError.notFound('Category not found');
      const children = await Category.find({ parent: cat._id }).select('_id').lean();
      const ids = [cat._id, ...children.map((c) => c._id)];
      filter.category = { $in: ids };
    }
    if (q.brand) {
      const brand = await Brand.findOne({ slug: q.brand });
      if (brand) filter.brand = brand._id;
    }
    if (q.tag) filter.tags = q.tag;
    if (q.q) filter.$text = { $search: q.q };
    if (q.minPrice != null || q.maxPrice != null) {
      const range: Record<string, number> = {};
      if (q.minPrice != null) range.$gte = rupeesToPaisa(q.minPrice);
      if (q.maxPrice != null) range.$lte = rupeesToPaisa(q.maxPrice);
      filter.minAdvance = range;
    }

    const sort = SORTS[q.sort] ?? SORTS['popular']!;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('brand', 'name slug')
        .populate('category', 'slug name')
        .lean(),
      Product.countDocuments(filter),
    ]);

    ok(
      res,
      items.map((p) => toSummary(p as unknown as LeanProduct)),
      paginationMeta(page, limit, total),
    );
  }),
);

// ---------------------------------------------------------------------------
// GET /products/:slug — PDP payload (plans, related, same brand)
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, status: 'active' })
      .populate('brand', 'name slug')
      .populate('category', 'name slug')
      .lean();
    if (!product) throw ApiError.notFound('Product not found');

    const plans = (product.plans ?? [])
      .filter((p) => p.isActive !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.term - b.term)
      .map((p) => ({ term: p.term, advance: p.advance, monthly: p.monthly }));

    const [related, sameBrand] = await Promise.all([
      Product.find({ category: product.category, _id: { $ne: product._id }, status: 'active' })
        .limit(8)
        .lean(),
      product.brand
        ? Product.find({ brand: product.brand, _id: { $ne: product._id }, status: 'active' }).limit(8).lean()
        : Promise.resolve([]),
    ]);

    ok(res, {
      product,
      plans,
      related: related.map((p) => toSummary(p as unknown as LeanProduct)),
      sameBrand: (sameBrand as unknown as LeanProduct[]).map((p) => toSummary(p)),
    });
  }),
);

// ---------------------------------------------------------------------------
// GET /deals/active — deal of the day with countdown payload
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/deals/active',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const deal = await Deal.findOne({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } })
      .sort({ endsAt: 1 })
      .populate({ path: 'products', match: { status: 'active' } })
      .lean();
    if (!deal) {
      ok(res, null);
      return;
    }
    ok(res, {
      title: deal.title,
      endsAt: deal.endsAt,
      products: (deal.products as unknown as LeanProduct[]).map((p) => toSummary(p)),
    });
  }),
);

// ---------------------------------------------------------------------------
// GET /home/sections — configured rails
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/home/sections',
  asyncHandler(async (_req, res) => {
    const sections = await HomeSection.find({ isActive: true }).sort({ order: 1 }).populate('category').lean();
    const out = await Promise.all(
      sections.map(async (s) => {
        const cat = s.category as unknown as { _id: unknown } | null;
        const filter: Record<string, unknown> = { status: 'active' };
        if (cat?._id) filter.category = cat._id;
        const products = await Product.find(filter).sort({ soldCount: -1, createdAt: -1 }).limit(s.limit ?? 8).lean();
        const catObj = s.category as { slug?: string } | null;
        const catSlug = catObj && typeof catObj === 'object' && 'slug' in catObj ? catObj.slug : undefined;
        return { key: s.key, title: s.title, categorySlug: catSlug, products: products.map((p) => toSummary(p as unknown as LeanProduct)) };
      }),
    );
    ok(res, out);
  }),
);

// ---------------------------------------------------------------------------
// GET /facets/:categorySlug — spec filters for the sidebar (RAM/Storage etc.)
// ---------------------------------------------------------------------------
catalogRouter.get(
  '/facets/:categorySlug',
  asyncHandler(async (req, res) => {
    const cat = await Category.findOne({ slug: req.params.categorySlug }).lean();
    if (!cat) throw ApiError.notFound('Category not found');
    ok(res, { filters: cat.filters ?? [] });
  }),
);
