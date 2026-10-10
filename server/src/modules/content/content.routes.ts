import { Router } from 'express';
import { Blog, Branch, CmsPage, Vendor } from '../../models/Content.js';
import { Product } from '../../models/Product.js';
import { ok, paginationMeta } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { parsePagination } from '../../utils/pagination.js';
import { toSummary } from '../catalog/catalog.routes.js';

export const contentRouter = Router();

// CMS page by slug (about, faqs, verification-process, payment-method, policies ...)
contentRouter.get(
  '/pages/:slug',
  asyncHandler(async (req, res) => {
    const page = await CmsPage.findOne({ slug: req.params.slug, isPublished: true }).lean();
    if (!page) throw ApiError.notFound('Page not found');
    ok(res, page);
  }),
);

// Blog listing
contentRouter.get(
  '/blogs',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const type = typeof req.query.type === 'string' ? req.query.type : 'blog';
    const filter: Record<string, unknown> = { type };
    const [items, total] = await Promise.all([
      Blog.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
      Blog.countDocuments(filter),
    ]);
    ok(res, items, paginationMeta(page, limit, total));
  }),
);

contentRouter.get(
  '/blogs/:slug',
  asyncHandler(async (req, res) => {
    const post = await Blog.findOne({ slug: req.params.slug }).lean();
    if (!post) throw ApiError.notFound('Post not found');
    ok(res, post);
  }),
);

// Facilitation centres, grouped by city for /visit-us
contentRouter.get(
  '/branches',
  asyncHandler(async (_req, res) => {
    const branches = await Branch.find({ isActive: true }).sort({ city: 1, name: 1 }).lean();
    const byCity = new Map<string, unknown[]>();
    for (const b of branches) {
      const list = byCity.get(b.city) ?? [];
      list.push({ id: String(b._id), name: b.name, city: b.city, address: b.address, phone: b.phone, hours: b.hours });
      byCity.set(b.city, list);
    }
    const cities = [...byCity.entries()].map(([city, list]) => ({ city, count: list.length, centres: list }));
    ok(res, { cities, total: branches.length });
  }),
);

// Vendor directory + storefront
contentRouter.get(
  '/stores',
  asyncHandler(async (_req, res) => {
    const stores = await Vendor.find({ status: 'approved' }).sort({ businessName: 1 }).lean();
    const counts = await Product.aggregate([
      { $match: { status: 'active', vendor: { $ne: null } } },
      { $group: { _id: '$vendor', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
    ok(
      res,
      stores.map((s) => ({
        id: String(s._id),
        name: s.businessName,
        slug: s.slug,
        address: s.address,
        logo: s.logo,
        productCount: countMap.get(String(s._id)) ?? 0,
      })),
    );
  }),
);

contentRouter.get(
  '/stores/:slug',
  asyncHandler(async (req, res) => {
    const store = await Vendor.findOne({ slug: req.params.slug, status: 'approved' }).lean();
    if (!store) throw ApiError.notFound('Store not found');
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { vendor: store._id, status: 'active' };
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ soldCount: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    ok(
      res,
      {
        store: {
          id: String(store._id),
          name: store.businessName,
          slug: store.slug,
          address: store.address,
          about: store.about,
          phone: store.phone,
          approvedBadges: store.approvedBadges ?? [],
        },
        products: items.map((p) => toSummary(p as unknown as Parameters<typeof toSummary>[0])),
      },
      paginationMeta(page, limit, total),
    );
  }),
);
