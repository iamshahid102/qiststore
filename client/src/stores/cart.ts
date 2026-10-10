'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  slug: string;
  name: string;
  qty: number;
  term: number;
  /** snapshots in paisa */
  cashPrice: number;
  advance: number;
  monthly: number;
  totalPayable: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'totalPayable'>) => void;
  remove: (slug: string, term: number) => void;
  setQty: (slug: string, term: number, qty: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.slug === item.slug && i.term === item.term);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.slug === item.slug && i.term === item.term
                  ? { ...i, qty: Math.min(10, i.qty + item.qty) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, totalPayable: item.advance + item.monthly * item.term }] };
        }),
      remove: (slug, term) =>
        set((state) => ({ items: state.items.filter((i) => !(i.slug === slug && i.term === term)) })),
      setQty: (slug, term, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug && i.term === term ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'qiststore-cart', skipHydration: false },
  ),
);

/** Cart totals in paisa. */
export function cartTotals(items: CartItem[]) {
  const totalAdvance = items.reduce((s, i) => s + i.advance * i.qty, 0);
  const totalMonthly = items.reduce((s, i) => s + i.monthly * i.qty, 0);
  const totalPayable = items.reduce((s, i) => s + i.totalPayable * i.qty, 0);
  return { totalAdvance, totalMonthlyPerMonth: totalMonthly, totalPayable };
}
