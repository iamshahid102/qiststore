import { Router } from 'express';
import { z } from 'zod';
import { Product, type ProductDoc } from '../../models/Product.js';
import { Order, nextOrderNumber } from '../../models/Order.js';
import { ok } from '../../utils/response.js';
import { ApiError, asyncHandler } from '../../utils/errors.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { sensitiveLimiter } from '../../middlewares/rateLimit.js';
import { buildSchedule, computePlan, type Term } from '../engine/installment.js';

export const checkoutRouter = Router();

// ---------------------------------------------------------------------------
// Shared item schema (quote + order)
// ---------------------------------------------------------------------------
const itemSchema = z.object({
  slug: z.string().min(1),
  qty: z.number().int().min(1).max(10).default(1),
  term: z.number().int(),
});

const quoteSchema = z.object({ items: z.array(itemSchema).min(1).max(20) });

interface PricedLine {
  slug: string;
  name: string;
  qty: number;
  term: number;
  cashPrice: number;
  advance: number;
  monthly: number;
  totalPayable: number;
}

/** Resolve + validate products and price every line SERVER-SIDE (never trust the client). */
async function priceLines(items: z.infer<typeof itemSchema>[]): Promise<{
  lines: PricedLine[];
  docs: ProductDoc[];
  totalAdvance: number;
  totalMonthly: number;
  totalPayable: number;
}> {
  const slugs = [...new Set(items.map((i) => i.slug))];
  const docs = await Product.find({ slug: { $in: slugs }, status: 'active' }).lean();
  const bySlug = new Map(docs.map((d) => [d.slug, d]));

  const lines: PricedLine[] = [];
  for (const item of items) {
    const doc = bySlug.get(item.slug);
    if (!doc) throw ApiError.badRequest(`Product not found: ${item.slug}`);
    const plan = (doc.plans ?? []).find((p) => p.term === item.term && p.isActive !== false);
    if (!plan) throw ApiError.badRequest(`Installment plan ${item.term} months not available for ${doc.name}`);

    const computed = computePlan(doc.cashPrice, {
      term: plan.term as Term,
      advance: plan.advance,
      monthly: plan.monthly,
    });
    lines.push({
      slug: doc.slug,
      name: doc.name,
      qty: item.qty,
      term: item.term,
      cashPrice: doc.cashPrice,
      advance: computed.advance * item.qty,
      monthly: computed.monthly * item.qty,
      totalPayable: computed.totalPayable * item.qty,
    });
  }

  const totalAdvance = lines.reduce((s, l) => s + l.advance, 0);
  const totalMonthly = lines.reduce((s, l) => s + l.monthly, 0); // per month across all lines
  const totalPayable = lines.reduce((s, l) => s + l.totalPayable, 0);
  return { lines, docs, totalAdvance, totalMonthly, totalPayable };
}

// POST /checkout/quote — server-priced preview (used by cart page)
checkoutRouter.post(
  '/checkout/quote',
  validate(quoteSchema),
  asyncHandler(async (req, res) => {
    const priced = await priceLines(req.body.items);
    ok(res, {
      lines: priced.lines,
      totals: {
        totalAdvance: priced.totalAdvance,
        totalMonthlyPerMonth: priced.totalMonthly,
        totalPayable: priced.totalPayable,
        deliveryFee: 0,
      },
    });
  }),
);

// ---------------------------------------------------------------------------
// POST /checkout/order — create order (guest-friendly, phone required)
// ---------------------------------------------------------------------------
const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(80),
    phone: z.string().regex(/^(\+92|0)3\d{9}$/, 'Invalid Pakistani mobile number'),
    email: z.string().email().optional().or(z.literal('')),
  }),
  shippingAddress: z.object({
    line1: z.string().min(4),
    line2: z.string().optional().default(''),
    city: z.string().min(2),
    area: z.string().min(2),
    postalCode: z.string().optional().default(''),
  }),
  paymentMethod: z.enum(['easypaisa', 'jazzcash', 'bank_transfer', 'cheque', 'cod']).default('easypaisa'),
  items: z.array(itemSchema).min(1).max(20),
});

checkoutRouter.post(
  '/checkout/order',
  sensitiveLimiter,
  validate(orderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof orderSchema>;
    const priced = await priceLines(body.items);

    const orderNumber = await nextOrderNumber();
    const now = new Date();

    // Schedule: for multiple items we sum monthly amounts per installment number.
    const maxTerm = Math.max(...priced.lines.map((l) => l.term));
    const schedule = buildSchedule(now, maxTerm as Term, priced.totalMonthly).map((entry) => ({
      ...entry,
      dueDate: new Date(entry.dueDate),
    }));

    const order = await Order.create({
      orderNumber,
      user: req.user?.sub ?? null,
      customer: { ...body.customer, email: body.customer.email ?? '' },
      items: priced.lines.map((l) => ({
        product: (priced.docs.find((d) => d.slug === l.slug)! as unknown as { _id: unknown })._id as never,
        slug: l.slug,
        name: l.name,
        qty: l.qty,
        term: l.term,
        cashPriceSnapshot: l.cashPrice,
        advanceSnapshot: l.advance,
        monthlySnapshot: l.monthly,
        totalPayableSnapshot: l.totalPayable,
      })),
      pricing: {
        totalAdvance: priced.totalAdvance,
        totalMonthlyPerMonth: priced.totalMonthly,
        totalPayable: priced.totalPayable,
        deliveryFee: 0,
      },
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      status: 'pending_verification',
      schedule,
      timeline: [
        { status: 'pending_verification', at: now, note: 'Order placed online' },
      ],
    });

    res.status(201).json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        pricing: order.pricing,
        nextSteps: [
          'Our sales team will call you within 24 hours to confirm the order.',
          'Verification: CNIC copy + CNIC copies of two guarantors + a signed form.',
          'Verification completes within 48 hours; delivery within 3 business days after approval.',
        ],
      },
    });
  }),
);

// GET /orders/track?orderNumber=&phone= — public tracking, no auth
checkoutRouter.get(
  '/orders/track',
  asyncHandler(async (req, res) => {
    const orderNumber = String(req.query.orderNumber ?? '').trim();
    const phone = String(req.query.phone ?? '').trim();
    if (!orderNumber || !phone) throw ApiError.badRequest('orderNumber and phone are required');

    const order = await Order.findOne({ orderNumber, 'customer.phone': phone })
      .select('orderNumber status createdAt pricing.totalAdvance pricing.totalPayable items.name items.qty items.term timeline schedule customer.name')
      .lean();
    if (!order) throw ApiError.notFound('No order found for these details');

    ok(res, {
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.createdAt,
      customerName: order.customer!.name,
      items: order.items.map((i) => ({ name: i.name, qty: i.qty, term: i.term })),
      totalAdvance: order.pricing!.totalAdvance,
      totalPayable: order.pricing!.totalPayable,
      timeline: order.timeline,
      schedule: order.schedule.map((s) => ({
        installmentNo: s.installmentNo,
        dueDate: s.dueDate,
        amount: s.amount,
        status: s.status,
      })),
    });
  }),
);

// GET /orders/mine — authed customer's orders
checkoutRouter.get(
  '/orders/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user!.sub })
      .sort({ createdAt: -1 })
      .select('orderNumber status createdAt pricing items schedule')
      .lean();
    ok(
      res,
      orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        placedAt: o.createdAt,
        pricing: o.pricing,
        items: o.items.map((i) => ({ name: i.name, qty: i.qty, term: i.term })),
        schedule: o.schedule.map((s) => ({
          installmentNo: s.installmentNo,
          dueDate: s.dueDate,
          amount: s.amount,
          status: s.status,
        })),
      })),
    );
  }),
);
