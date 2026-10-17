/** Shapes returned by /api/v1/admin — kept in one place for the dashboard. */

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  imageUrl: string;
  cashPrice: number;
  minAdvance: number;
  stock: { qty: number; track: boolean; status: string };
  status: 'draft' | 'active' | 'inactive';
  featured: boolean;
  tags: string[];
  plans: number;
  soldCount: number;
  category: { _id: string; name: string; slug: string } | null;
  brand: { _id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlan {
  term: number;
  advance: number;
  monthly: number;
  isActive: boolean;
  sortOrder: number;
  totalPayable?: number;
}

export interface AdminProductImage {
  url: string;
  alt?: string;
  sort?: number;
  publicId?: string;
}

export interface AdminProduct {
  _id: string;
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  images: AdminProductImage[];
  cashPrice: number;
  minAdvance: number;
  plans: AdminPlan[];
  stock: { qty: number; track: boolean; status: string };
  tags: string[];
  status: 'draft' | 'active' | 'inactive';
  featured: boolean;
  warranty: 'company' | 'seller';
  vendorName: string;
  delivery: { free: boolean; instantCities: string[] };
  seo: { title: string; description: string };
  category: { _id: string; name: string; slug: string } | string | null;
  brand: { _id: string; name: string; slug: string } | string | null;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductInput {
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  vendorName: string;
  description: string;
  highlights: string[];
  specs: { key: string; value: string }[];
  images: { url: string; alt: string; sort: number }[];
  cashPrice: number;
  plans: AdminPlan[];
  stock: { qty: number; track: boolean; status: string };
  tags: string[];
  status: string;
  featured: boolean;
  warranty: string;
  delivery: { free: boolean; instantCities: string[] };
  seo: { title: string; description: string };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  parentName: string | null;
  icon: string;
  isActive: boolean;
  order: number;
  productCount: number;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  isActive: boolean;
}

export interface AdminOrderItem {
  product: string;
  slug?: string;
  name: string;
  qty: number;
  term: number;
  cashPriceSnapshot: number;
  advanceSnapshot: number;
  monthlySnapshot: number;
  totalPayableSnapshot: number;
}

export interface AdminOrderRow {
  _id: string;
  orderNumber: string;
  status: string;
  customer: { name: string; phone: string; email?: string };
  pricing: { totalAdvance: number; totalMonthlyPerMonth: number; totalPayable: number; deliveryFee: number };
  items: AdminOrderItem[];
  paymentMethod: string;
  verification: { status: string };
  createdAt: string;
  user?: string | null;
}

export interface AdminScheduleEntry {
  installmentNo: number;
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'due' | 'paid' | 'partial' | 'overdue' | 'waived';
  paidAmount?: number;
  paidAt?: string;
  method?: string;
  txnRef?: string;
}

export interface AdminOrderDetail extends Omit<AdminOrderRow, 'user'> {
  shippingAddress: { line1?: string; line2?: string; city?: string; area?: string; postalCode?: string };
  verification: {
    status: string;
    customer?: { cnicNo?: string; cnicFrontUrl?: string; cnicBackUrl?: string; selfieUrl?: string };
    rejectionReason?: string;
    approvedAt?: string;
    reviewedBy?: { name: string; phone: string };
  };
  schedule: AdminScheduleEntry[];
  timeline: { status: string; at: string; note: string }[];
  notes?: string;
  allowedTransitions: string[];
  payments: { collected: number; remaining: number };
  user?: { _id: string; name: string; phone: string; email?: string; role: string; status: string } | null;
}

export interface AdminCustomerRow {
  _id: string;
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  status: string;
  verificationStatus: string;
  isPhoneVerified: boolean;
  ordersCount: number;
  totalSpend: number;
  totalContractValue: number;
  lastOrderAt: string | null;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminCustomerDetail {
  customer: Omit<AdminCustomerRow, 'ordersCount' | 'totalSpend' | 'totalContractValue' | 'lastOrderAt' | 'id'>;
  orders: {
    _id: string;
    orderNumber: string;
    status: string;
    items: AdminOrderItem[];
    pricing: { totalAdvance: number; totalPayable: number; totalMonthlyPerMonth: number };
    createdAt: string;
    paymentMethod: string;
    verification?: { status: string };
  }[];
  stats: {
    orders: number;
    totalAdvance: number;
    totalContractValue: number;
    activeOrders: number;
    lastOrderAt: string | null;
  };
}

export interface AdminStats {
  totals: {
    orders: number;
    revenue: number;
    monthlyReceivable: number;
    averageOrderValue: number;
    customers: number;
    newCustomers30d: number;
    products: number;
    activeProducts: number;
  };
  pendingVerification: number;
  statusCounts: Record<string, number>;
  lowStockCount: number;
  salesSeries: { date: string; orders: number; advance: number }[];
  recentOrders: AdminOrderRow[];
  topProducts: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string }[];
    soldCount: number;
    minAdvance: number;
    ratingStats?: { avg: number; count: number };
  }[];
  lowStock: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string }[];
    stock: { qty: number };
    minAdvance: number;
  }[];
  generatedAt: string;
}

export type AdminRole = 'admin' | 'staff' | 'customer' | 'vendor';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  cod: 'Cash on Delivery',
};

export const TERM_OPTIONS = [3, 6, 9, 12, 18, 24];
