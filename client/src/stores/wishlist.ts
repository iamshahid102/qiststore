'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  slug: string;
  name: string;
  minAdvance: number;
}

interface WishlistState {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (slug: string) => boolean;
  remove: (slug: string) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) => {
          const exists = state.items.some((i) => i.slug === item.slug);
          return { items: exists ? state.items.filter((i) => i.slug !== item.slug) : [...state.items, item] };
        }),
      has: (slug) => get().items.some((i) => i.slug === slug),
      remove: (slug) => set((state) => ({ items: state.items.filter((i) => i.slug !== slug) })),
    }),
    { name: 'qiststore-wishlist' },
  ),
);
