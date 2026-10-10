export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  cashPrice: number; // paisa
  minAdvance: number; // paisa
  imageUrl: string;
  brandName?: string;
  categorySlug?: string;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  stockStatus: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  nameUrdu?: string;
  slug: string;
  icon: string;
  children: { id: string; name: string; slug: string; parentSlug: string }[];
}

export interface PlanOption {
  term: number;
  advance: number; // paisa
  monthly: number; // paisa
}

export interface ProductDetail {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  images: { url: string; alt: string }[];
  cashPrice: number;
  minAdvance: number;
  vendorName: string;
  warranty: string;
  brand?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
  stock?: { status: string };
  delivery?: { free: boolean; instantCities: string[] };
}

export interface ProductDetailPayload {
  product: ProductDetail;
  plans: PlanOption[];
  related: ProductSummary[];
  sameBrand: ProductSummary[];
}

export interface HomeSection {
  key: string;
  title: string;
  categorySlug?: string;
  products: ProductSummary[];
}

export interface DealPayload {
  title: string;
  endsAt: string;
  products: ProductSummary[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CmsBlock {
  type: 'heading' | 'paragraph' | 'steps' | 'faq' | 'image' | 'stats';
  title?: string;
  body?: string;
  bodyUrdu?: string;
  items?: { title: string; body: string; bodyUrdu?: string }[];
}

export interface CmsPage {
  slug: string;
  title: string;
  subtitle: string;
  template: string;
  blocks: CmsBlock[];
  seo?: { title?: string; description?: string };
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  type: string;
  tags: string[];
  publishedAt: string;
}

export interface BranchCentre {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  hours: string;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  address: string;
  logo: string;
  productCount: number;
}

export interface OrderTrackResult {
  orderNumber: string;
  status: string;
  placedAt: string;
  customerName: string;
  items: { name: string; qty: number; term: number }[];
  totalAdvance: number;
  totalPayable: number;
  timeline: { status: string; at: string; note: string }[];
  schedule: { installmentNo: number; dueDate: string; amount: number; status: string }[];
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pending Verification',
  verification_in_progress: 'Verification In Progress',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  defaulted: 'Defaulted',
};
