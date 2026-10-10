'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart, cartTotals } from '@/stores/cart';
import { apiPost } from '@/lib/api';
import { formatRs } from '@/lib/format';

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Hyderabad', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

interface OrderResponse {
  orderNumber: string;
  status: string;
  nextSteps: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const totals = cartTotals(items);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Karachi',
    area: '',
    line1: '',
    line2: '',
    paymentMethod: 'easypaisa',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await apiPost<OrderResponse>('/checkout/order', {
        customer: { name: form.name, phone: form.phone, email: form.email },
        shippingAddress: { line1: form.line1, line2: form.line2, city: form.city, area: form.area },
        paymentMethod: form.paymentMethod,
        items: items.map((i) => ({ slug: i.slug, qty: i.qty, term: i.term })),
      });
      clear();
      sessionStorage.setItem('qiststore-last-order', JSON.stringify(result));
      router.push('/checkout/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nothing to check out</h1>
        <Link href="/shop" className="mt-4 inline-block text-brand-600 hover:underline">← Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Contact Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Full name *</span>
                <input required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" placeholder="Ali Khan" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Mobile number * (for order updates)</span>
                <input required pattern="^(\+92|0)3\d{9}$" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" placeholder="03XX-XXXXXXX" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-600">Email (optional)</span>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" placeholder="ali@example.com" />
              </label>
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Delivery Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">City *</span>
                <select required value={form.city} onChange={(e) => set('city', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2">
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Area / Colony *</span>
                <input required value={form.area} onChange={(e) => set('area', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" placeholder="DHA Phase 5" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-600">House / Street / Landmark *</span>
                <input required minLength={4} value={form.line1} onChange={(e) => set('line1', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" placeholder="House 123, Street 4, near Bank" />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-gray-600">Address line 2 (optional)</span>
                <input value={form.line2} onChange={(e) => set('line2', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2" />
              </label>
            </div>
          </section>

          {/* Payment method (installment collection) */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-gray-900">Installment Payment Method</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { value: 'easypaisa', label: 'EasyPaisa' },
                { value: 'jazzcash', label: 'JazzCash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cod', label: 'Cash on Delivery (advance)' },
              ].map((m) => (
                <label key={m.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  form.paymentMethod === m.value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
                  <input type="radio" name="pm" value={m.value} checked={form.paymentMethod === m.value}
                    onChange={(e) => set('paymentMethod', e.target.value)} />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              You will receive a Consumer ID after verification approval to pay monthly installments from your wallet.
            </p>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-xl border border-cream-200 bg-white p-4 sm:p-5 lg:sticky lg:top-28">
          <h2 className="mb-4 font-bold text-gray-900">Your Order</h2>
          <ul className="mb-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={`${i.slug}-${i.term}`} className="flex justify-between gap-3">
                <span className="text-gray-700">
                  {i.name} <span className="text-xs text-gray-400">({i.term}m × {i.qty})</span>
                </span>
                <span className="shrink-0 font-semibold">{formatRs(i.totalPayable * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Advance today</dt>
              <dd className="font-bold text-brand-700">{formatRs(totals.totalAdvance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Monthly</dt>
              <dd className="font-semibold">{formatRs(totals.totalMonthlyPerMonth)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total payable</dt>
              <dd>{formatRs(totals.totalPayable)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-lg bg-accent-500 py-3 font-bold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {submitting ? 'Placing order…' : 'Place Order'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            By placing this order you agree to our terms &amp; Musawamah agreement.
          </p>
        </aside>
      </form>
    </div>
  );
}
