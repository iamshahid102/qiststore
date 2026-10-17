'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  LuArrowRight,
  LuCircleAlert,
  LuClipboardList,
  LuPackage,
  LuRefreshCw,
  LuTrendingUp,
  LuUsers,
  LuWallet,
} from 'react-icons/lu';
import { adminGet } from '@/lib/admin-api';
import { formatDate, formatRs } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/api';
import type { AdminStats } from '@/types/admin';
import { Banner, Card, CardHeader, EmptyState, PageHeader, Spinner, StatCard, StatusBadge } from '@/components/admin/ui';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminGet<AdminStats>('/stats');
      setStats(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return <Spinner label="Loading your store overview…" />;
  }

  if (error && !stats) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Store performance at a glance." />
        <Banner tone="error">{error}</Banner>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <LuRefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const { totals, salesSeries, statusCounts } = stats;
  const chartMax = Math.max(...salesSeries.map((d) => d.advance), 1);
  const periodAdvance = salesSeries.reduce((sum, d) => sum + d.advance, 0);
  const periodOrders = salesSeries.reduce((sum, d) => sum + d.orders, 0);
  const statusEntries = Object.entries(statusCounts)
    .filter(([status, count]) => count > 0 && status !== 'all')
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Revenue, order pipeline and catalogue health — refreshed live from the API."
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700"
          >
            <LuRefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> Refresh
          </button>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Advance collected"
          value={formatRs(totals.revenue)}
          hint={`${totals.averageOrderValue ? formatRs(totals.averageOrderValue) : '—'} avg per approved order`}
          icon={<LuWallet className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Total orders"
          value={totals.orders.toLocaleString()}
          hint={`${stats.pendingVerification} awaiting verification`}
          icon={<LuClipboardList className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Customers"
          value={totals.customers.toLocaleString()}
          hint={`+${totals.newCustomers30d} in the last 30 days`}
          icon={<LuUsers className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Live products"
          value={totals.activeProducts.toLocaleString()}
          hint={`${totals.products - totals.activeProducts} draft / archived`}
          icon={<LuPackage className="h-5 w-5" />}
          tone="ink"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Pending verification"
          value={String(stats.pendingVerification)}
          href="/admin/orders?status=pending_verification"
          tone="amber"
        />
        <MiniStat
          label="Monthly receivable"
          value={formatRs(totals.monthlyReceivable)}
          hint="Across approved contracts"
          tone="brand"
        />
        <MiniStat label="Low stock" value={String(stats.lowStockCount)} href="/admin/products?stock=low" tone="rose" />
        <MiniStat
          label="Avg. advance"
          value={totals.averageOrderValue ? formatRs(totals.averageOrderValue) : '—'}
          hint="Approved orders"
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Revenue chart */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Order value — last 14 days"
            subtitle={`${periodOrders} orders · ${formatRs(periodAdvance)} in advances`}
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-900/50">
                <LuTrendingUp className="h-3 w-3" /> Daily
              </span>
            }
          />
          <div className="px-4 pb-4 pt-5 sm:px-5">
            <div className="flex h-48 items-end gap-1.5 sm:gap-2">
              {salesSeries.map((day) => {
                const height = Math.max(day.advance > 0 ? 6 : 2, Math.round((day.advance / chartMax) * 100));
                return (
                  <div key={day.date} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100 sm:block">
                      {formatRs(day.advance)}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition group-hover:from-accent-500 group-hover:to-accent-400"
                      style={{ height: `${height}%` }}
                      title={`${formatDate(day.date)} — ${day.orders} order(s), ${formatRs(day.advance)}`}
                    />
                    <span className="hidden text-[9px] font-semibold text-ink-900/35 sm:block">
                      {new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Status split */}
        <Card>
          <CardHeader title="Order pipeline" subtitle="Live status distribution" />
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {statusEntries.length === 0 && <p className="text-sm text-ink-900/50">No orders yet.</p>}
            {statusEntries.map(([status, count]) => (
              <div key={status}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-ink-900/70">
                    {ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                  </span>
                  <span className="shrink-0 font-bold text-ink-900">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-cream-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(3, (count / Math.max(totals.orders, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <Link
              href="/admin/orders"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
            >
              Manage all orders <LuArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent orders */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent orders"
            subtitle="Newest first"
            action={
              <Link href="/admin/orders" className="text-xs font-bold text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {stats.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders placed on the storefront will appear here." icon={<LuClipboardList className="h-5 w-5" />} />
          ) : (
            <div className="qb-scroll-x">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                    <th className="px-4 py-2.5 sm:px-5">Order</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Advance</th>
                    <th className="px-3 py-2.5">Placed</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.orderNumber} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60">
                      <td className="px-4 py-3 sm:px-5">
                        <Link href={`/admin/orders/${order.orderNumber}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <p className="truncate text-xs font-semibold text-ink-900">{order.customer.name}</p>
                        <p className="text-[11px] text-ink-900/45">{order.customer.phone}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-ink-900">
                        {formatRs(order.pricing.totalAdvance)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-900/55">{formatDate(order.createdAt)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader
            title="Low stock"
            subtitle="5 units or fewer"
            action={
              <Link href="/admin/products?stock=low" className="text-xs font-bold text-brand-700 hover:underline">
                Restock
              </Link>
            }
          />
          {stats.lowStock.length === 0 ? (
            <EmptyState title="Inventory is healthy" description="No active product is running low." icon={<LuPackage className="h-5 w-5" />} />
          ) : (
            <ul className="divide-y divide-cream-100">
              {stats.lowStock.map((product) => (
                <li key={product.slug}>
                  <Link href={`/admin/products/${product.slug}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-cream-50 sm:px-5">
                    <ProductThumb url={product.images?.[0]?.url} name={product.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink-900">{product.name}</p>
                      <p className="text-[11px] text-ink-900/45">{formatRs(product.minAdvance)} advance</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                      <LuCircleAlert className="h-3 w-3" /> {product.stock.qty}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader
          title="Best sellers"
          subtitle="Ranked by units sold"
          action={
            <Link href="/admin/products" className="text-xs font-bold text-brand-700 hover:underline">
              All products
            </Link>
          }
        />
        {stats.topProducts.length === 0 ? (
          <EmptyState title="No product data yet" icon={<LuPackage className="h-5 w-5" />} />
        ) : (
          <div className="grid gap-2 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-5">
            {stats.topProducts.map((product, index) => (
              <Link
                key={product.slug}
                href={`/admin/products/${product.slug}`}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-cream-200 p-2.5 transition hover:border-brand-300 hover:bg-brand-50/30"
              >
                <span className="w-5 shrink-0 text-center text-xs font-extrabold text-ink-900/30">{index + 1}</span>
                <ProductThumb url={product.images?.[0]?.url} name={product.name} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink-900">{product.name}</p>
                  <p className="text-[11px] text-ink-900/45">{product.soldCount} sold</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone: 'amber' | 'brand' | 'rose' | 'emerald';
}) {
  const tones = {
    amber: 'text-amber-700 bg-amber-50',
    brand: 'text-brand-700 bg-brand-50',
    rose: 'text-rose-700 bg-rose-50',
    emerald: 'text-emerald-700 bg-emerald-50',
  };
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-900/45">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-900/45">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`rounded-2xl border border-cream-200/80 p-4 transition hover:border-brand-300 ${tones[tone]}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`rounded-2xl border border-cream-200/80 p-4 ${tones[tone]}`}>{inner}</div>;
}

function ProductThumb({ url, name }: { url?: string; name: string }) {
  if (!url) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-[10px] font-bold text-ink-900/30">
        N/A
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt={name}
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded-lg bg-cream-50 object-contain"
    />
  );
}
