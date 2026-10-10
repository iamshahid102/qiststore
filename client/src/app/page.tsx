import Image from 'next/image';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { CategoryNode, DealPayload, HomeSection } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';
import { SectionRail } from '@/components/home/SectionRail';
import { CategoryMarquee } from '@/components/home/CategoryMarquee';
import { DealsCountdown } from '@/components/home/DealsCountdown';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [cats, deal, sections] = await Promise.all([
    apiGet<CategoryNode[]>('/categories/tree'),
    apiGet<DealPayload>('/deals/active'),
    apiGet<HomeSection[]>('/home/sections'),
  ]);

  const categories = cats?.data ?? [];
  const dealData = deal?.data ?? null;
  const rails = sections?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4">
      {/* Hero */}
      <section className="mt-3 overflow-hidden rounded-2xl bg-brand-800 sm:mt-4">
        <div className="grid items-center gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-2 lg:gap-10 lg:px-12 lg:py-12">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-400 sm:text-sm">
              Buy Now · Pay Monthly
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Everything your home needs — on easy installments
            </h1>
            <p className="mt-3 max-w-xl text-sm text-brand-100 sm:text-base">
              Low advance, fixed monthly payments, free nationwide delivery. No bank account or credit card required.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="rounded-full bg-accent-500 px-6 py-3 text-center text-sm font-bold text-white hover:bg-accent-600"
              >
                Shop All Products
              </Link>
              <Link
                href="/page/verification-process"
                className="rounded-full border border-white/40 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                How It Works
              </Link>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/brand/brand-banner.jpg"
              alt="Qist Store — easy installments on electronics and home appliances"
              width={1600}
              height={873}
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="h-auto w-full rounded-xl shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Category quick links */}
      <section className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:grid-cols-6 lg:grid-cols-9">
        {categories.slice(0, 18).map((c) => (
          <Link
            key={c.slug}
            href={`/product-category/${c.slug}`}
            className="flex min-w-0 flex-col items-center gap-1 rounded-lg bg-white px-2 py-3 text-center text-[11px] font-medium text-gray-700 shadow-sm hover:text-brand-600 sm:text-xs"
          >
            <span className="text-xl sm:text-2xl" aria-hidden>{c.icon || '🛍️'}</span>
            <span className="line-clamp-2">{c.name}</span>
          </Link>
        ))}
      </section>

      {/* Deals of the Day */}
      {dealData && dealData.products.length > 0 && (
        <section className="mt-6 rounded-2xl border border-accent-200 bg-white p-3 shadow-sm sm:mt-10 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">🔥 Deals of the Day</h2>
            <DealsCountdown endsAt={dealData.endsAt} />
          </div>
          <ProductGrid products={dealData.products} priorityFirst />
        </section>
      )}

      {/* Category marquee */}
      <CategoryMarquee categories={categories} />

      {/* Rails */}
      {rails.map((rail) => (
        <SectionRail key={rail.key} title={rail.title} categorySlug={rail.categorySlug} products={rail.products} />
      ))}

      {/* Trust strip */}
      <section className="mt-8 grid gap-3 rounded-2xl bg-cream-200 p-4 sm:mt-12 sm:grid-cols-3 sm:p-6">
        {[
          { title: 'Transparent Pricing', body: 'The total you see at checkout is the total you pay. No surprises, ever.' },
          { title: '48-Hour Verification', body: 'Quick CNIC-based verification with two guarantors — no paperwork maze.' },
          { title: 'Free Nationwide Delivery', body: 'Delivered to your doorstep in 3–5 business days after approval.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
            <p className="font-bold text-brand-700">{f.title}</p>
            <p className="mt-1 text-sm text-gray-600">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
