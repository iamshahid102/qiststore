import Link from 'next/link';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { CategoryNode } from '@/types/api';

/** Infinite-scrolling category strip (CSS marquee, pauses on hover). */
export function CategoryMarquee({ categories }: { categories: CategoryNode[] }) {
  if (categories.length === 0) return null;
  const loop = [...categories, ...categories]; // duplicate for seamless loop
  return (
    <section className="mt-10 overflow-hidden sm:mt-14">
      <SectionHeading eyebrow="Top picks" title="Top Categories of the Month" href="/shop" linkLabel="View all" />
      <div className="qb-scroll-x -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="qb-marquee-track flex gap-3 pb-2">
          {loop.map((c, i) => (
            <Link
              key={`${c.slug}-${i}`}
              href={`/product-category/${c.slug}`}
              className="qb-card flex w-28 shrink-0 flex-col items-center gap-2 px-3 py-4 transition hover:border-brand-300 sm:w-32"
            >
              <span className="qb-icon-chip h-12 w-12">
                <CategoryIcon name={c.icon} className="h-6 w-6" />
              </span>
              <span className="line-clamp-2 text-center text-xs font-semibold text-ink-900">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
