import type { Metadata } from 'next';
import { apiGet } from '@/lib/api';
import type { ProductSummary } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';
import { Pagination } from '@/components/listing/Pagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const page = sp.page ?? '1';

  const query = new URLSearchParams({ page, limit: '24' });
  if (q) query.set('q', q);

  const products = q ? await apiGet<ProductSummary[]>(`/products?${query.toString()}`) : null;
  const items = products?.data ?? [];
  const meta = products?.meta ?? { page: 1, limit: 24, total: 0, pages: 1 };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {q ? <>Results for “{q}”</> : 'Search'}
      </h1>
      <p className="mb-4 mt-1 text-sm text-gray-500">{meta.total} products found</p>
      <ProductGrid products={items} />
      <Pagination meta={meta} query={q ? { q } : {}} />
    </div>
  );
}
