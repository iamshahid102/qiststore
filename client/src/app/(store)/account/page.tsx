'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { clearAuth, parseAuth, useAuthRaw } from '@/lib/auth';
import { apiGetClient } from '@/lib/api';
import { formatRs, formatDate } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/api';

interface MyOrder {
  orderNumber: string;
  status: string;
  placedAt: string;
  pricing: { totalAdvance: number; totalPayable: number };
  items: { name: string; qty: number; term: number }[];
  schedule: { installmentNo: number; dueDate: string; amount: number; status: string }[];
}

export default function AccountPage() {
  const raw = useAuthRaw();
  const auth = useMemo(() => parseAuth(raw), [raw]);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    apiGetClient<MyOrder[]>('/orders/mine', auth.accessToken)
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load orders');
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  if (!auth) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Please log in</h1>
        <p className="mt-2 text-gray-500">Log in to see your orders and installment schedule.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/account/login" className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white">Log in</Link>
          <Link href="/account/register" className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold">Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hello, {auth.user.name}</h1>
          <p className="text-sm text-gray-500">{auth.user.phone}</p>
        </div>
        <button
          onClick={() => clearAuth()}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Log out
        </button>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-gray-900">My Orders</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {orders.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No orders yet. <Link href="/shop" className="text-brand-600 hover:underline">Start shopping →</Link>
        </p>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.orderNumber} className="rounded-xl border border-cream-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono font-bold text-gray-900">{o.orderNumber}</p>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {ORDER_STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Placed {formatDate(o.placedAt)}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
              {o.items.map((i, idx) => (
                <li key={idx}>{i.name} × {i.qty} ({i.term}m)</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              Advance: <b>{formatRs(o.pricing.totalAdvance)}</b> · Total: <b>{formatRs(o.pricing.totalPayable)}</b>
            </p>

            {o.schedule.length > 0 && (
              <div className="qb-scroll-x mt-3">
              <table className="w-full min-w-[400px] text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-400">
                    <th className="py-1.5">#</th>
                    <th className="py-1.5">Due</th>
                    <th className="py-1.5 text-right">Amount</th>
                    <th className="py-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {o.schedule.map((s) => (
                    <tr key={s.installmentNo} className="border-b border-cream-100 last:border-0">
                      <td className="whitespace-nowrap py-1.5">{s.installmentNo}</td>
                      <td className="whitespace-nowrap py-1.5">{formatDate(s.dueDate)}</td>
                      <td className="whitespace-nowrap py-1.5 text-right font-semibold">{formatRs(s.amount)}</td>
                      <td className="py-1.5 pl-3 text-right capitalize text-gray-500">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
