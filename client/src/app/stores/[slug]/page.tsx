import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { ProductSummary } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';

export const dynamic = 'force-dynamic';

interface StorePayload {
  store: {
    id: string;
    name: string;
    slug: string;
    address: string;
    about: string;
    phone: string;
    approvedBadges: string[];
  };
  products: ProductSummary[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await apiGet<StorePayload>(`/stores/${slug}`);
  if (!payload) return { title: 'Store' };
  return {
    title: `${payload.data.store.name} — Products on Installment`,
    description: `Buy products from ${payload.data.store.name} on easy monthly installments.`,
  };
}

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await apiGet<StorePayload>(`/stores/${slug}`);
  if (!payload) notFound();
  const { store, products } = payload.data;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          {store.approvedBadges.map((b) => (
            <span key={b} className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">✓ {b}</span>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">📍 {store.address}</p>
        {store.about && <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">{store.about}</p>}
      </div>

      <h2 className="mb-4 mt-8 text-lg font-bold text-gray-900">
        {products.length} products found
      </h2>
      <ProductGrid products={products} priorityFirst />
    </div>
  );
}
