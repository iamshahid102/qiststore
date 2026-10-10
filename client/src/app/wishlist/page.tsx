'use client';

import Link from 'next/link';
import { useWishlist } from '@/stores/wishlist';
import { formatRs } from '@/lib/format';

export default function WishlistPage() {
  const { items, remove } = useWishlist();

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          Your wishlist is empty. Tap the ♡ on any product to save it here.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((i) => (
            <li key={i.slug} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div>
                <Link href={`/product/${i.slug}`} className="font-semibold text-gray-900 hover:text-brand-600">{i.name}</Link>
                <p className="text-sm text-brand-700">{formatRs(i.minAdvance)} <span className="text-xs text-gray-400">Advance</span></p>
              </div>
              <button onClick={() => remove(i.slug)} className="text-sm text-red-500 hover:underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
