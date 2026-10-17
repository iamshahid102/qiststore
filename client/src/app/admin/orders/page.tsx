'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LuClipboardList, LuDownload, LuEye, LuSearch, LuX } from 'react-icons/lu';
import { adminDownloadCsv, adminGet } from '@/lib/admin-api';
import { formatDate, formatRs } from '@/lib/format';
import { ORDER_STATUS_LABELS, type PaginationMeta } from '@/types/api';
import { PAYMENT_METHOD_LABELS, type AdminOrderRow } from '@/types/admin';
import {
  Banner,
  Card,
  EmptyState,
  Pagination,
  PageHeader,
  Spinner,
  StatusBadge,
  cn,
  inputClass,
  selectClass,
} from '@/components/admin/ui';

type OrdersMeta = PaginationMeta & { statusCounts?: Record<string, number> };

const STATUS_TABS = [
  'all',
  'pending_verification',
  'verification_in_progress',
  'approved',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'rejected',
  'cancelled',
];

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [meta, setMeta] = useState<OrdersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s && STATUS_TABS.includes(s)) setStatus(s);
    const q = params.get('q');
    if (q) {
      setSearch(q);
      setQuery(q);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query, status, paymentMethod, from, to, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status, sort });
      if (query) params.set('q', query);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await adminGet<AdminOrderRow[]>(`/orders?${params.toString()}`);
      setRows(res.data);
      setMeta((res.meta as OrdersMeta) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, status, sort, query, paymentMethod, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    window.history.replaceState(null, '', `/admin/orders${qs ? `?${qs}` : ''}`);
  }, [query, status, paymentMethod, from, to, page]);

  const counts = meta?.statusCounts ?? {};

  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      const suffix = status === 'all' ? '' : `?status=${status}`;
      await adminDownloadCsv(`/orders/export.csv${suffix}`, `qist-orders-${new Date().toISOString().slice(0, 10)}.csv`);
      setNotice('CSV exported with the current status filter.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setQuery('');
    setStatus('all');
    setPaymentMethod('');
    setFrom('');
    setTo('');
    setSort('newest');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Review verification, move orders through fulfilment and record installment payments."
        actions={
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
          >
            <LuDownload className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Card>
        <div className="qb-scroll-x flex items-center gap-1 border-b border-cream-200 px-2 pt-2 sm:px-3">
          {STATUS_TABS.map((tab) => {
            const label = tab === 'all' ? 'All orders' : (ORDER_STATUS_LABELS[tab] ?? tab.replace(/_/g, ' '));
            const count = counts[tab] ?? 0;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatus(tab)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition',
                  status === tab ? 'text-brand-700' : 'text-ink-900/50 hover:text-ink-900',
                )}
              >
                {label}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      status === tab ? 'bg-brand-100 text-brand-700' : 'bg-cream-100 text-ink-900/50',
                    )}
                  >
                    {count}
                  </span>
                )}
                {status === tab && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-b border-cream-200 p-3 lg:flex-row lg:items-center lg:p-4">
          <div className="relative min-w-0 flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, customer name or phone…"
              aria-label="Search orders"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={`${selectClass} lg:w-40`}
              aria-label="Filter by payment method"
            >
              <option value="">All payments</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={inputClass}
              aria-label="From date"
              title="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={inputClass}
              aria-label="To date"
              title="To date"
            />
            <select value={sort} onChange={(event) => setSort(event.target.value)} className={`${selectClass} lg:w-40`} aria-label="Sort orders">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="value-desc">Highest value</option>
              <option value="advance-desc">Highest advance</option>
            </select>
          </div>
          {(query || paymentMethod || from || to || status !== 'all') && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg px-2 py-1 text-[11px] font-bold text-ink-900/50 hover:text-rose-600 lg:self-auto"
            >
              <LuX className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {loading ? (
          <Spinner label="Loading orders…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No orders match these filters"
            description="Try a different status tab or clear the search."
            icon={<LuClipboardList className="h-5 w-5" />}
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
              >
                Reset filters
              </button>
            }
          />
        ) : (
          <div className="qb-scroll-x">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                  <th className="px-4 py-2.5 sm:pl-5">Order</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Items</th>
                  <th className="px-3 py-2.5 text-right">Advance</th>
                  <th className="px-3 py-2.5 text-right">Monthly</th>
                  <th className="px-3 py-2.5">Payment</th>
                  <th className="px-3 py-2.5">Verification</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Placed</th>
                  <th className="px-3 py-2.5 sm:pr-5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60">
                    <td className="px-4 py-3 sm:pl-5">
                      <Link href={`/admin/orders/${order.orderNumber}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[170px] truncate text-xs font-semibold text-ink-900">{order.customer.name}</p>
                      <p className="text-[11px] text-ink-900/45">{order.customer.phone}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-[190px] truncate text-xs text-ink-900/70">
                        {order.items[0]?.name ?? '—'}
                        {order.items.length > 1 ? ` +${order.items.length - 1}` : ''}
                      </p>
                      <p className="text-[11px] text-ink-900/40">
                        {order.items.reduce((sum, item) => sum + item.qty, 0)} unit(s) · {order.items[0]?.term}m
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-ink-900">
                      {formatRs(order.pricing.totalAdvance)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-ink-900/70">
                      {formatRs(order.pricing.totalMonthlyPerMonth)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-900/60">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.verification?.status ?? 'not_submitted'} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-900/55">{formatDate(order.createdAt)}</td>
                    <td className="px-3 py-3 sm:pr-5">
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-cream-300 px-2 text-[11px] font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        <LuEye className="h-3 w-3" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} label="orders" />}
      </Card>
    </div>
  );
}
