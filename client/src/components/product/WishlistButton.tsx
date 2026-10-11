'use client';

import { LuHeart } from 'react-icons/lu';
import { useWishlist } from '@/stores/wishlist';

export function WishlistButton({ slug, name, minAdvance }: { slug: string; name: string; minAdvance: number }) {
  const { items, toggle } = useWishlist();
  const active = items.some((i) => i.slug === slug);

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        toggle({ slug, name, minAdvance });
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition hover:scale-110 ${
        active ? 'text-accent-500' : 'text-gray-400 hover:text-accent-500'
      }`}
    >
      <LuHeart className={`h-[18px] w-[18px] ${active ? 'fill-accent-500' : ''}`} />
    </button>
  );
}
