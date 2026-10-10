import type { Metadata } from 'next';
import { apiGet } from '@/lib/api';
import type { CategoryNode, ProductSummary } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';
import { FilterSidebar } from '@/components/listing/FilterSidebar';
import { Pagination } from '@/components/listing/Pagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop — All Products on Installment',
  description: 'Explore all products available on easy monthly installments. Filter by category, brand and advance price.',
};

interface SearchParams {
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = sp.page ?? '1';

  const query = new URLSearchParams();
  if (sp.category) query.set('category', sp.category);
  if (sp.brand) query.set('brand', sp.brand);
  if (sp.minPrice) query.set('minPrice', sp.minPrice);
  if (sp.maxPrice) query.set('maxPrice', sp.maxPrice);
  if (sp.sort) query.set('sort', sp.sort);
  query.set('page', page);
  query.set('limit', '24');

  const [products, cats] = await Promise.all([
    apiGet<ProductSummary[]>(`/products?${query.toString()}`),
    apiGet<CategoryNode[]>('/categories/tree'),
  ]);

  const items = products?.data ?? [];
  const meta = products?.meta ?? { page: 1, limit: 24, total: items.length, pages: 1 };
  const categories = cats?.data ?? [];

  const flatQuery: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) if (v) flatQuery[k] = v;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Shop</h1>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterSidebar categories={categories} />
        <div className="flex-1">
          <p className="mb-3 text-sm text-gray-500">{meta.total} products found</p>
          <ProductGrid products={items} priorityFirst />
          <Pagination meta={meta} query={flatQuery} />
        </div>
      </div>
    </div>
  );
}
