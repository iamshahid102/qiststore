import Image from 'next/image';
import Link from 'next/link';
import { LuArrowRight, LuStar } from 'react-icons/lu';
import { formatRs } from '@/lib/format';
import type { ProductSummary } from '@/types/api';
import { WishlistButton } from '@/components/product/WishlistButton';

/**
 * Product image tile. Cloudinary URLs are served through next/image
 * (AVIF/WebP + responsive sizes). Products without an image fall back to a
 * deterministic gradient placeholder instead of a broken <img>.
 */
export function ProductImage({
  name,
  url,
  priority,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: {
  name: string;
  url?: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (url) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={url}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-3 sm:p-4"
        />
      </div>
    );
  }
  const hue = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 94%), hsl(${(hue + 40) % 360} 70% 84%))` }}
      aria-hidden
    >
      <span className="select-none text-4xl font-black drop-shadow sm:text-5xl" style={{ color: `hsl(${hue} 50% 45%)` }}>
        {initial}
      </span>
    </div>
  );
}

/** Compact star rating — accent stars, muted count. */
function Rating({ avg, count }: { avg: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs font-semibold text-gray-400">No reviews yet</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <LuStar className="h-3.5 w-3.5 fill-accent-500 text-accent-500" aria-hidden />
      <span className="font-bold text-ink-900">{avg.toFixed(1)}</span>
      <span className="text-gray-400">({count})</span>
    </span>
  );
}

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const isNew = product.ratingCount === 0 && !product.tags.includes('deal-of-day');
  return (
    <article className="qb-card qb-card-hover group relative flex flex-col overflow-hidden">
      <div className="absolute right-2 top-2 z-10">
        <WishlistButton slug={product.slug} name={product.name} minAdvance={product.minAdvance} />
      </div>
      <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
        {product.tags.includes('deal-of-day') && (
          <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            Deal
          </span>
        )}
        {isNew && (
          <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
            New
          </span>
        )}
      </div>

      <Link
        href={`/product/${product.slug}`}
        className="block aspect-square w-full overflow-hidden bg-cream-50"
        tabIndex={-1}
        aria-hidden
      >
        <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
          <ProductImage name={product.name} url={product.imageUrl} priority={priority} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brandName && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{product.brandName}</p>
        )}
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink-900 hover:text-brand-600"
        >
          {product.name}
        </Link>

        <div className="mt-2">
          <Rating avg={product.ratingAvg} count={product.ratingCount} />
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand-700 sm:text-xl">
              {formatRs(product.minAdvance)}
            </span>
            <span className="text-[11px] font-semibold text-gray-500">advance</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Cash {formatRs(product.cashPrice)}
          </p>

          <Link
            href={`/product/${product.slug}`}
            className="qb-btn-accent mt-3 w-full px-3 py-2.5 text-xs sm:text-sm"
          >
            View Plans
            <LuArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityFirst = false }: { products: ProductSummary[]; priorityFirst?: boolean }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-300 bg-white p-8 text-center text-gray-500 sm:p-12">
        No products found. Try a different filter.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={priorityFirst && i < 4} />
      ))}
    </div>
  );
}
