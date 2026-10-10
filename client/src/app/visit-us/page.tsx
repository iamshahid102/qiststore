import type { Metadata } from 'next';
import { apiGet } from '@/lib/api';
import type { BranchCentre } from '@/types/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visit Us — Facilitation Centres Near You',
  description: 'Find a Qist Store facilitation centre in your city.',
};

interface BranchesPayload {
  cities: { city: string; count: number; centres: BranchCentre[] }[];
  total: number;
}

export default async function VisitUsPage() {
  const payload = await apiGet<BranchesPayload>('/branches');
  const cities = payload?.data?.cities ?? [];

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Visit Us</h1>
      <p className="mt-1 text-gray-600">
        Find a Qist Store facilitation centre near you — {payload?.data?.total ?? 0} locations across Pakistan.
      </p>

      <div className="mt-8 space-y-8">
        {cities.map((group) => (
          <section key={group.city}>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900">
              {group.city}
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {group.count} {group.count === 1 ? 'location' : 'locations'}
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.centres.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="mt-1 text-sm text-gray-600">{c.address}</p>
                  <p className="mt-2 text-xs text-gray-400">{c.hours}{c.phone ? ` · ${c.phone}` : ''}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        {cities.length === 0 && <p className="text-gray-500">No centres found.</p>}
      </div>
    </div>
  );
}
