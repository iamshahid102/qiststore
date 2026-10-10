import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { ORDER_STATUSES } from '../modules/engine/installment.js';

const itemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    slug: String,
    name: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    term: { type: Number, required: true },
    cashPriceSnapshot: { type: Number, required: true },
    advanceSnapshot: { type: Number, required: true },
    monthlySnapshot: { type: Number, required: true },
    totalPayableSnapshot: { type: Number, required: true },
  },
  { _id: false },
);

const scheduleSchema = new Schema(
  {
    installmentNo: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['upcoming', 'due', 'paid', 'partial', 'overdue', 'waived'], default: 'upcoming' },
    paidAmount: { type: Number, default: 0 },
    paidAt: Date,
    method: String,
    txnRef: String,
  },
  { _id: false },
);

const guarantorSchema = new Schema(
  {
    name: String,
    relation: String,
    cnicNo: String,
    phone: String,
    address: String,
    ownsHomeOrBusiness: { type: Boolean, default: false },
  },
  { _id: false },
);

const verificationSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'in_review', 'approved', 'rejected'],
      default: 'not_submitted',
    },
    customer: {
      cnicNo: String,
      cnicFrontUrl: String,
      cnicBackUrl: String,
      selfieUrl: String,
      signatureUrl: String,
    },
    guarantors: [guarantorSchema],
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    approvedAt: Date,
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true, index: true },
      email: { type: String, default: '' },
    },
    items: { type: [itemSchema], required: true },
    pricing: {
      totalAdvance: { type: Number, required: true },
      totalMonthlyPerMonth: { type: Number, required: true },
      totalPayable: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
    },
    shippingAddress: {
      line1: String,
      line2: String,
      city: String,
      area: String,
      postalCode: String,
    },
    paymentMethod: {
      type: String,
      enum: ['easypaisa', 'jazzcash', 'bank_transfer', 'cheque', 'cod'],
      default: 'easypaisa',
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_verification', index: true },
    verification: { type: verificationSchema, default: () => ({}) },
    schedule: { type: [scheduleSchema], default: [] },
    timeline: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ 'customer.phone': 1, orderNumber: 1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order: Model<OrderDoc> = model('Order', orderSchema);

/** Monotonic sequence for human-readable order numbers. */
const counterSchema = new Schema({ key: { type: String, unique: true }, seq: { type: Number, default: 0 } });
export const Counter = model('Counter', counterSchema);

export async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `order-${year}`;
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true },
  ).lean();
  const seq = doc?.seq ?? 1;
  return `QST-${year}-${String(seq).padStart(6, '0')}`;
}
