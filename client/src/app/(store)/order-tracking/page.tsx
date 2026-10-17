'use client';

import { useState } from 'react';
import { apiGetClient } from '@/lib/api';
import { formatRs, formatDate } from '@/lib/format';
import { ORDER_STATUS_LABELS, type OrderTrackResult } from '@/types/api';

export default function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<OrderTrackResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onTrack(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await apiGetClient<OrderTrackResult>(
        `/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tracking failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
      <p className="mt-1 text-sm text-gray-600">
        Enter your Order ID and the mobile number used at checkout.
      </p>

      <form onSubmit={onTrack} className="mt-6 rounded-xl border border-cream-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Order ID</span>
            <input required value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="QST-2026-000001"
              className="w-full rounded border border-gray-300 px-3 py-2 font-mono" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Phone number</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="03XX-XXXXXXX"
              className="w-full rounded border border-gray-300 px-3 py-2" />
          </label>
        </div>
        <button type="submit" disabled={loading}
          className="mt-4 rounded-lg bg-brand-600 px-8 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {loading ? 'Tracking…' : 'Track Order'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="mt-6 space-y-5">
          <div className="rounded-xl border border-cream-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono font-bold text-gray-900">{result.orderNumber}</p>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                {ORDER_STATUS_LABELS[result.status] ?? result.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Placed on {formatDate(result.placedAt)}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {result.items.map((i, idx) => (
                <li key={idx}>{i.name} × {i.qty} ({i.term}-month plan)</li>
              ))}
            </ul>
            <div className="mt-3 flex gap-6 border-t border-gray-100 pt-3 text-sm">
              <span>Advance: <b>{formatRs(result.totalAdvance)}</b></span>
              <span>Total payable: <b>{formatRs(result.totalPayable)}</b></span>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-cream-200 bg-white p-4 sm:p-5">
            <h2 className="mb-3 font-bold text-gray-900">Status Timeline</h2>
            <ol className="space-y-3">
              {result.timeline.map((t, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <div>
                    <p className="font-semibold text-gray-800">{ORDER_STATUS_LABELS[t.status] ?? t.status}</p>
                    <p className="text-xs text-gray-500">{formatDate(t.at)}{t.note ? ` · ${t.note}` : ''}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Installment schedule */}
          {result.schedule.length > 0 && (
            <div className="rounded-xl border border-cream-200 bg-white p-4 sm:p-5">
              <h2 className="mb-3 font-bold text-gray-900">Installment Schedule</h2>
              <div className="qb-scroll-x">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2">#</th>
                    <th className="py-2">Due date</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((s) => (
                    <tr key={s.installmentNo} className="border-b border-cream-100 last:border-0">
                      <td className="whitespace-nowrap py-2">{s.installmentNo}</td>
                      <td className="whitespace-nowrap py-2">{formatDate(s.dueDate)}</td>
                      <td className="whitespace-nowrap py-2 text-right font-semibold">{formatRs(s.amount)}</td>
                      <td className="py-2 pl-3 text-right capitalize text-gray-600">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
