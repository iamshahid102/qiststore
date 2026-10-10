import Link from 'next/link';
import type { CategoryNode } from '@/types/api';

/** Infinite-scrolling category strip (two rows: CSS marquee). */
export function CategoryMarquee({ categories }: { categories: CategoryNode[] }) {
  if (categories.length === 0) return null;
  const loop = [...categories, ...categories]; // duplicate for seamless loop
  return (
    <section className="mt-6 overflow-hidden sm:mt-8">
      <h2 className="mb-3 text-lg font-bold text-gray-900 sm:text-2xl">Top Categories of the Month</h2>
      <div className="relative">
        <div className="qb-marquee-track flex gap-3 pb-2">
          {loop.map((c, i) => (
            <Link
              key={`${c.slug}-${i}`}
              href={`/product-category/${c.slug}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-cream-200 bg-white px-2 py-3 hover:border-brand-300 hover:shadow-sm sm:w-28 sm:px-3 sm:py-4"
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>{c.icon || '🛍️'}</span>
              <span className="line-clamp-2 text-center text-[11px] font-medium text-gray-700 sm:text-xs">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
