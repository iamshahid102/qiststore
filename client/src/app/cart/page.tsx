'use client';

import Link from 'next/link';
import { LuShoppingCart } from 'react-icons/lu';
import { useCart, cartTotals } from '@/stores/cart';
import { formatRs } from '@/lib/format';

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const totals = cartTotals(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <span className="qb-icon-chip mx-auto h-20 w-20">
          <LuShoppingCart className="h-9 w-9" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Browse our catalog and pick a plan that fits your budget.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your Cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <div key={`${item.slug}-${item.term}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-200 bg-white p-3 sm:gap-4 sm:p-4">
              <div className="flex-1">
                <Link href={`/product/${item.slug}`} className="font-semibold text-gray-900 hover:text-brand-600">
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-gray-500">
                  Plan: {formatRs(item.monthly)} × {item.term} months · Advance {formatRs(item.advance)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded border border-gray-300">
                    <button onClick={() => setQty(item.slug, item.term, item.qty - 1)} className="px-2.5 py-1" aria-label="Decrease">−</button>
                    <span className="w-7 text-center text-sm">{item.qty}</span>
                    <button onClick={() => setQty(item.slug, item.term, item.qty + 1)} className="px-2.5 py-1" aria-label="Increase">+</button>
                  </div>
                  <button onClick={() => remove(item.slug, item.term)} className="text-sm text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
              <div className="w-full text-left sm:w-auto sm:text-right">
                <p className="font-bold text-brand-700">{formatRs(item.totalPayable * item.qty)}</p>
                <p className="text-xs text-gray-400">total</p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl border border-cream-200 bg-white p-4 sm:p-5 lg:sticky lg:top-28">
          <h2 className="mb-4 font-bold text-gray-900">Order Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Advance (at checkout)</dt>
              <dd className="font-semibold">{formatRs(totals.totalAdvance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Monthly (per month)</dt>
              <dd className="font-semibold">{formatRs(totals.totalMonthlyPerMonth)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Delivery</dt>
              <dd className="font-semibold text-green-600">FREE</dd>
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-base font-bold">
              <dt>Total payable</dt>
              <dd className="text-brand-700">{formatRs(totals.totalPayable)}</dd>
            </div>
          </dl>
          <Link
            href="/checkout"
            className="mt-5 block rounded-lg bg-accent-500 py-3 text-center font-bold text-white hover:bg-accent-600"
          >
            Proceed to Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-gray-400">No documentation charges · Verification call within 24h</p>
        </aside>
      </div>
    </div>
  );
}
