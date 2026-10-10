import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { ALLOWED_TERMS } from '../modules/engine/installment.js';

const planSchema = new Schema(
  {
    term: { type: Number, required: true, enum: ALLOWED_TERMS },
    advance: { type: Number, required: true }, // paisa
    monthly: { type: Number, required: true }, // paisa
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    sku: { type: String, required: true, unique: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null, index: true },
    vendorName: { type: String, default: 'Qist Store Fulfilment' },
    description: { type: String, default: '' },
    highlights: [String],
    specs: [{ key: String, value: String }],
    images: [{ url: String, alt: String, sort: Number }],
    /** Cash (full upfront) price in paisa — basis of markup computation. */
    cashPrice: { type: Number, required: true, min: 0 },
    /** Minimum advance shown on listing cards, in paisa. */
    minAdvance: { type: Number, required: true, min: 0 },
    plans: { type: [planSchema], default: [] },
    stock: {
      qty: { type: Number, default: 0 },
      track: { type: Boolean, default: true },
      status: { type: String, enum: ['in_stock', 'out_of_stock', 'pre_order'], default: 'in_stock' },
    },
    tags: [{ type: String, enum: ['deal-of-day', 'special-offer', 'instant-delivery', 'featured'] }],
    status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'active', index: true },
    featured: { type: Boolean, default: false },
    ratingStats: { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    soldCount: { type: Number, default: 0 },
    warranty: { type: String, enum: ['company', 'seller'], default: 'company' },
    delivery: {
      free: { type: Boolean, default: true },
      instantCities: [String],
    },
    seo: { title: { type: String, default: '' }, description: { type: String, default: '' } },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', 'specs.value': 'text', vendorName: 'text' });
productSchema.index({ category: 1, status: 1, minAdvance: 1 });
productSchema.index({ brand: 1, status: 1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product: Model<ProductDoc> = model('Product', productSchema);
