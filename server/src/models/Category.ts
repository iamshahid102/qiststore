import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, default: '' },
    slug: { type: String, required: true, unique: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    icon: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** Spec filter definitions used by the listing sidebar (e.g. RAM/Storage for mobiles). */
    filters: [
      {
        key: String,
        label: String,
        type: { type: String, enum: ['enum', 'range'], default: 'enum' },
        options: [String],
      },
    ],
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category: Model<CategoryDoc> = model('Category', categorySchema);

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: { type: String, default: '' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type BrandDoc = InferSchemaType<typeof brandSchema>;
export const Brand: Model<BrandDoc> = model('Brand', brandSchema);
