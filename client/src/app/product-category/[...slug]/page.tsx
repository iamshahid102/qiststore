import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { CategoryNode, ProductSummary } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';
import { FilterSidebar } from '@/components/listing/FilterSidebar';
import { Pagination } from '@/components/listing/Pagination';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ page?: string; sort?: string; minPrice?: string; maxPrice?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const leaf = decodeURIComponent(slug[slug.length - 1] ?? '').replace(/-/g, ' ');
  return {
    title: `${leaf || 'Category'} Price in Pakistan on Installment`,
    description: `Buy ${leaf} on easy monthly installments in Pakistan. Best advance prices and free delivery.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // [...slug]: [category] or [category, brand]
  const categorySlug = slug[0];
  if (!categorySlug) notFound();
  const brandSlug = slug[1];

  const query = new URLSearchParams();
  query.set('category', categorySlug);
  if (brandSlug) query.set('brand', brandSlug);
  if (sp.sort) query.set('sort', sp.sort);
  if (sp.minPrice) query.set('minPrice', sp.minPrice);
  if (sp.maxPrice) query.set('maxPrice', sp.maxPrice);
  query.set('page', sp.page ?? '1');
  query.set('limit', '24');

  const [products, cats, brands] = await Promise.all([
    apiGet<ProductSummary[]>(`/products?${query.toString()}`),
    apiGet<CategoryNode[]>('/categories/tree'),
    apiGet<{ name: string; slug: string }[]>(`/brands?category=${categorySlug}`),
  ]);

  if (!products) notFound();

  const items = products.data ?? [];
  const meta = products.meta ?? { page: 1, limit: 24, total: items.length, pages: 1 };
  const categories = cats?.data ?? [];
  const active = categories.find((c) => c.slug === categorySlug);
  const heading = (brandSlug ? brandSlug.replace(/-/g, ' ') : active?.name ?? categorySlug) ;

  const flatQuery: Record<string, string> = { category: categorySlug };
  if (brandSlug) flatQuery.brand = brandSlug;
  if (sp.sort) flatQuery.sort = sp.sort;

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <h1 className="text-2xl font-bold capitalize text-gray-900">{heading} on Installment</h1>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-gray-600">
        Shop {heading} on easy monthly installments in Pakistan. Choose your plan at checkout — low advance,
        fixed monthly payments and free nationwide delivery.
      </p>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterSidebar categories={categories} brands={brands?.data ?? []} />
        <div className="flex-1">
          <p className="mb-3 text-sm text-gray-500">{meta.total} products found</p>
          <ProductGrid products={items} priorityFirst />
          <Pagination meta={meta} query={flatQuery} />
        </div>
      </div>
    </div>
  );
}
