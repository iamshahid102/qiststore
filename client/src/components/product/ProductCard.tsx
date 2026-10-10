import Image from 'next/image';
import Link from 'next/link';
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
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 92%), hsl(${(hue + 40) % 360} 70% 80%))` }}
      aria-hidden
    >
      <span className="select-none text-4xl font-black drop-shadow sm:text-5xl" style={{ color: `hsl(${hue} 50% 45%)` }}>
        {initial}
      </span>
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg">
      <div className="absolute right-2 top-2 z-10">
        <WishlistButton slug={product.slug} name={product.name} minAdvance={product.minAdvance} />
      </div>
      {product.tags.includes('deal-of-day') && (
        <span className="absolute left-2 top-2 z-10 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">
          Deal
        </span>
      )}
      <Link href={`/product/${product.slug}`} className="block">
        <div className="aspect-square w-full overflow-hidden bg-cream-50">
          <ProductImage name={product.name} url={product.imageUrl} priority={priority} />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <p className="text-base font-bold text-brand-700 sm:text-lg">
          {formatRs(product.minAdvance)} <span className="text-[11px] font-semibold text-gray-500 sm:text-xs">Advance</span>
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-gray-800 hover:text-brand-600 sm:text-sm"
        >
          {product.name}
        </Link>
        {product.brandName && <p className="mt-1 text-xs text-gray-400">{product.brandName}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400">
            {product.ratingCount > 0 ? `★ ${product.ratingAvg.toFixed(1)}` : 'New'}
          </span>
          <Link href={`/product/${product.slug}`} className="rounded bg-brand-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 sm:text-xs">
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, priorityFirst = false }: { products: ProductSummary[]; priorityFirst?: boolean }) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 sm:p-12">
        No products found. Try a different filter.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={priorityFirst && i < 4} />
      ))}
    </div>
  );
}
