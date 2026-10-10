import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// CMS pages (about, faqs, policies, verification, payment-method ...)
// ---------------------------------------------------------------------------
const blockSchema = new Schema(
  {
    type: { type: String, enum: ['heading', 'paragraph', 'steps', 'faq', 'image', 'stats'], required: true },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    bodyUrdu: { type: String, default: '' },
    items: [{ title: String, body: String, bodyUrdu: String }],
  },
  { _id: false },
);

const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    template: {
      type: String,
      enum: ['about', 'contact', 'faq', 'policy', 'verification', 'payment', 'become-vendor', 'generic'],
      default: 'generic',
    },
    blocks: { type: [blockSchema], default: [] },
    seo: { title: { type: String, default: '' }, description: { type: String, default: '' } },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CmsPageDoc = InferSchemaType<typeof cmsPageSchema>;
export const CmsPage: Model<CmsPageDoc> = model('CmsPage', cmsPageSchema);

// ---------------------------------------------------------------------------
// Blog / Press
// ---------------------------------------------------------------------------
const blogSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    excerpt: { type: String, default: '' },
    body: { type: String, required: true },
    cover: { type: String, default: '' },
    author: { type: String, default: 'Qist Store Team' },
    type: { type: String, enum: ['blog', 'press'], default: 'blog' },
    tags: [String],
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type BlogDoc = InferSchemaType<typeof blogSchema>;
export const Blog: Model<BlogDoc> = model('Blog', blogSchema);

// ---------------------------------------------------------------------------
// Facilitation centres (/visit-us)
// ---------------------------------------------------------------------------
const branchSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true, index: true },
    address: { type: String, required: true },
    phone: { type: String, default: '' },
    hours: { type: String, default: 'Mon-Sat, 11am-11pm' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type BranchDoc = InferSchemaType<typeof branchSchema>;
export const Branch: Model<BranchDoc> = model('Branch', branchSchema);

// ---------------------------------------------------------------------------
// Vendors + public stores
// ---------------------------------------------------------------------------
const vendorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    businessName: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    about: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'approved' },
    commissionPercent: { type: Number, default: 0 },
    approvedBadges: [String],
  },
  { timestamps: true },
);

export type VendorDoc = InferSchemaType<typeof vendorSchema>;
export const Vendor: Model<VendorDoc> = model('Vendor', vendorSchema);

// ---------------------------------------------------------------------------
// Deals of the day
// ---------------------------------------------------------------------------
const dealSchema = new Schema(
  {
    title: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type DealDoc = InferSchemaType<typeof dealSchema>;
export const Deal: Model<DealDoc> = model('Deal', dealSchema);

// ---------------------------------------------------------------------------
// Home page rails/sections
// ---------------------------------------------------------------------------
const homeSectionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    limit: { type: Number, default: 8 },
  },
  { timestamps: true },
);

export type HomeSectionDoc = InferSchemaType<typeof homeSectionSchema>;
export const HomeSection: Model<HomeSectionDoc> = model('HomeSection', homeSectionSchema);
