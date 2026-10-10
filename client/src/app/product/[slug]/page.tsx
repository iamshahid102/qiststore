import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { ProductDetailPayload } from '@/types/api';
import { formatRs } from '@/lib/format';
import { PlanSelector } from '@/components/product/PlanSelector';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductImage } from '@/components/product/ProductCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await apiGet<ProductDetailPayload>(`/products/${slug}`);
  if (!payload) return { title: 'Product' };
  const p = payload.data.product;
  return {
    title: `${p.name} Price in Pakistan on Installment`,
    description: `Buy ${p.name} on easy monthly installments. Low advance payment, company warranty and free delivery across Pakistan.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await apiGet<ProductDetailPayload>(`/products/${slug}`);
  if (!payload) notFound();

  const { product, plans, related, sameBrand } = payload.data;
  const minPlan = plans[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: Math.round(product.minAdvance / 100),
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-x-1 text-xs text-gray-500 sm:mb-4 sm:text-sm" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {' / '}
        {product.category && (
          <>
            <Link href={`/product-category/${product.category.slug}`} className="hover:text-brand-600">
              {product.category.name}
            </Link>
            {' / '}
          </>
        )}
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        {/* Gallery */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="aspect-square w-full">
            <ProductImage name={product.name} url={product.images?.[0]?.url} priority />
          </div>
        </div>

        {/* Info + plans */}
        <div>
          {product.brand && (
            <Link href={`/product-category/${product.category?.slug ?? ''}/${product.brand.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">
              {product.brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sold &amp; delivered by <span className="font-semibold text-gray-700">{product.vendorName}</span>
            {product.warranty === 'company' && ' · Company Warranty'}
          </p>

          {/* Advance from */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-brand-700">{formatRs(product.minAdvance)}</span>
            <span className="text-sm font-semibold text-gray-500">Advance</span>
            {minPlan && (
              <span className="text-sm text-gray-400">
                · {formatRs(minPlan.monthly)} × {minPlan.term} months
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Cash price: <span className="line-through">{formatRs(product.cashPrice)}</span>
          </p>

          {/* Highlights */}
          {product.highlights?.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {product.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-brand-600">✓</span> {h}
                </li>
              ))}
            </ul>
          )}

          {/* Plan selector */}
          <div className="mt-6">
            <PlanSelector slug={product.slug} productName={product.name} cashPrice={product.cashPrice} plans={plans} />
          </div>
        </div>
      </div>

      {/* Description + specs */}
      <div className="mt-8 grid gap-5 lg:mt-12 lg:grid-cols-2 lg:gap-8">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Description</h2>
          <p className="whitespace-pre-line text-sm leading-6 text-gray-700">{product.description}</p>
        </section>
        {product.specs?.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-gray-900">Specifications</h2>
            <table className="w-full text-sm">
              <tbody>
                {product.specs.map((s) => (
                  <tr key={s.key} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-500">{s.key}</td>
                    <td className="py-2 text-gray-900">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {sameBrand.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Same Brand</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sameBrand.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
