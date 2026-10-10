import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import type { ProductSummary } from '@/types/api';

export function SectionRail({ title, categorySlug, products }: { title: string; categorySlug?: string; products: ProductSummary[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-8 sm:mt-10">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">{title}</h2>
        {categorySlug && (
          <Link
            href={`/product-category/${categorySlug}`}
            className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 sm:px-4 sm:text-sm"
          >
            View All →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {products.slice(0, 8).map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
      </div>
    </section>
  );
}
