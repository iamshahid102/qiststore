import Image from 'next/image';
import Link from 'next/link';
import { LuArrowRight, LuBadgePercent, LuHeadphones, LuPackageCheck, LuShieldCheck, LuStar, LuTruck, LuWallet } from 'react-icons/lu';
import { apiGet } from '@/lib/api';
import type { CategoryNode, DealPayload, HomeSection } from '@/types/api';
import { ProductGrid } from '@/components/product/ProductCard';
import { SectionRail } from '@/components/home/SectionRail';
import { CategoryMarquee } from '@/components/home/CategoryMarquee';
import { DealsCountdown } from '@/components/home/DealsCountdown';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export const dynamic = 'force-dynamic';

const TRUST = [
  { Icon: LuTruck, title: 'Free Delivery', body: 'On all orders nationwide' },
  { Icon: LuPackageCheck, title: 'Easy Verification', body: 'Quick and hassle-free setup' },
  { Icon: LuWallet, title: 'No Bank Account', body: 'Simple payment options' },
  { Icon: LuShieldCheck, title: 'No Hidden Charges', body: 'Zero documentation fees' },
];

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
      {/* ================= Hero ================= */}
      <section className="relative mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-cream-50 via-white to-brand-50 sm:mt-4">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-200/50 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />

        <div className="relative grid items-center gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-2 lg:gap-12 lg:px-12 lg:py-14">
          <div>
            <span className="qb-btn-light gap-2 px-4 py-1.5 text-xs">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
              New Arrival
            </span>
            <h1 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Everything your home needs —{' '}
              <span className="text-accent-500">on easy installments</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
              Low advance, fixed monthly payments, free nationwide delivery. No bank account or
              credit card required.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop" className="qb-btn-accent px-7 py-3">
                Shop All Products
                <LuArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/page/verification-process" className="qb-btn-light px-6 py-3">
                How It Works
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-brand-400 to-brand-700"
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-extrabold text-ink-900">12,000+</span> happy customers
                <span className="ml-2 hidden items-center gap-0.5 sm:inline-flex" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <LuStar key={i} className="h-3.5 w-3.5 fill-accent-500 text-accent-500" aria-hidden />
                  ))}
                </span>
              </p>
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
              className="h-auto w-full rounded-2xl shadow-[0_24px_60px_-30px_rgba(11,27,57,0.55)]"
            />
            <div className="absolute -bottom-4 left-4 hidden rounded-2xl bg-white px-4 py-3 shadow-lg sm:block">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                <LuBadgePercent className="h-4 w-4 text-accent-500" /> Starts from
              </p>
              <p className="mt-0.5 text-lg font-extrabold text-brand-700">
                Rs. 1,075<span className="text-xs font-semibold text-gray-500">/month</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Browse by category ================= */}
      <section className="mt-10 sm:mt-14">
        <SectionHeading
          eyebrow="Shop by Category"
          title="Browse by Category"
          href="/shop"
          linkLabel="All categories"
        />
        <div className="qb-scroll-x -mx-3 px-3 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-max grid-cols-4 gap-2.5 sm:min-w-0 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
            {categories.slice(0, 14).map((c) => (
              <Link
                key={c.slug}
                href={`/product-category/${c.slug}`}
                className="qb-card qb-card-hover group flex w-[6.5rem] flex-col items-center gap-2.5 px-2 py-4 text-center sm:w-auto"
              >
                <span className="qb-icon-chip h-12 w-12 transition group-hover:bg-brand-600 group-hover:text-white">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink-900 sm:text-sm">
                  {c.name}
                </span>
                <span className="text-[11px] text-gray-500">
                  {c.children.length > 0 ? `${c.children.length}+ items` : 'Explore'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Deals banner ================= */}
      {dealData && dealData.products.length > 0 && (
        <section className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 px-5 py-7 sm:mt-14 sm:px-10 sm:py-9">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-accent-500/25 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="qb-btn-light gap-2 px-4 py-1.5 text-xs">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                Special Offer
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {dealData.title || 'Deals of the Day'}
              </h2>
              <div className="mt-4">
                <DealsCountdown endsAt={dealData.endsAt} variant="boxes" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/shop?sort=discount" className="qb-btn-accent px-7 py-3">
                Check it out
                <LuArrowRight className="h-4 w-4" />
              </Link>
              <span className="hidden items-center gap-2 text-sm font-semibold text-brand-100 sm:flex">
                <LuHeadphones className="h-4 w-4 text-accent-400" /> Support 24/7
              </span>
            </div>
          </div>

          <div className="relative mt-6">
            <ProductGrid products={dealData.products.slice(0, 4)} priorityFirst />
          </div>
        </section>
      )}

      {/* Category marquee */}
      <CategoryMarquee categories={categories} />

      {/* Rails */}
      {rails.map((rail) => (
        <SectionRail key={rail.key} title={rail.title} categorySlug={rail.categorySlug} products={rail.products} />
      ))}

      {/* ================= Trust strip ================= */}
      <section className="qb-card mt-10 grid grid-cols-2 gap-4 p-5 sm:mt-14 sm:grid-cols-4 sm:p-7">
        {TRUST.map(({ Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="qb-icon-chip h-11 w-11 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink-900">{title}</p>
              <p className="truncate text-xs text-gray-500">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
