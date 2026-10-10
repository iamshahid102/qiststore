'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

interface OrderResponse {
  orderNumber: string;
  status: string;
  nextSteps: string[];
}

const STORAGE_KEY = 'qiststore-last-order';
const subscribe = () => () => {};

/** Reads the last order from sessionStorage without setState-in-effect. */
function useLastOrder(): OrderResponse | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.sessionStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrderResponse;
  } catch {
    return null;
  }
}

export default function CheckoutSuccessPage() {
  const order = useLastOrder();

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-3 sm:px-4 py-20 text-center">
        <p>No recent order found.</p>
        <Link href="/shop" className="mt-3 inline-block text-brand-600 hover:underline">← Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 sm:px-4 py-16 text-center">
      <p className="text-6xl">🎉</p>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Order placed!</h1>
      <p className="mt-2 text-gray-600">
        Your order number is{' '}
        <span className="rounded bg-brand-50 px-2 py-1 font-mono font-bold text-brand-800">{order.orderNumber}</span>
      </p>
      <p className="mt-1 text-sm text-gray-500">Save this number — you can use it to track your order.</p>

      <ol className="mx-auto mt-8 max-w-md space-y-3 text-left">
        {(order.nextSteps ?? []).map((step, i) => (
          <li key={i} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/order-tracking" className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Track This Order
        </Link>
        <Link href="/shop" className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold hover:bg-gray-50">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
