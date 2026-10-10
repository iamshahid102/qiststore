'use client';

import { useWishlist } from '@/stores/wishlist';

export function WishlistButton({ slug, name, minAdvance }: { slug: string; name: string; minAdvance: number }) {
  const { items, toggle } = useWishlist();
  const active = items.some((i) => i.slug === slug);

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={(e) => {
        e.preventDefault();
        toggle({ slug, name, minAdvance });
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition ${
        active ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
      }`}
    >
      {active ? '♥' : '♡'}
    </button>
  );
}
