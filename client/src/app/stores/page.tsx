import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { StoreSummary } from '@/types/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Qist Store Marketplace — Partner Stores',
  description: 'Browse approved partner stores selling electronics and appliances on installments.',
};

export default async function StoresPage() {
  const stores = await apiGet<StoreSummary[]>('/stores');
  const items = stores?.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Partner Stores</h1>
      <p className="mt-1 text-gray-600">{items.length} approved vendors on the marketplace.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Link key={s.id} href={`/stores/${s.slug}`}
            className="rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
            <p className="text-lg font-bold text-gray-900">{s.name}</p>
            <p className="mt-1 text-sm text-gray-500">{s.address}</p>
            <p className="mt-3 text-sm font-semibold text-brand-700">{s.productCount} products →</p>
          </Link>
        ))}
        {items.length === 0 && <p className="text-gray-500">No stores found.</p>}
      </div>
    </div>
  );
}
