import { ProductGrid } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { ProductSummary } from '@/types/api';

export function SectionRail({
  title,
  categorySlug,
  products,
}: {
  title: string;
  categorySlug?: string;
  products: ProductSummary[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-10 sm:mt-14">
      <SectionHeading
        eyebrow="Our Collection"
        title={title}
        href={categorySlug ? `/product-category/${categorySlug}` : '/shop'}
        linkLabel="View all"
      />
      <ProductGrid products={products.slice(0, 8)} priorityFirst />
    </section>
  );
}
