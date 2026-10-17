'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LuBan, LuCheck, LuEye, LuSearch, LuUsers, LuX } from 'react-icons/lu';
import { adminGet, adminPatch } from '@/lib/admin-api';
import { formatDate, formatRs } from '@/lib/format';
import type { PaginationMeta } from '@/types/api';
import type { AdminCustomerRow } from '@/types/admin';
import {
  Banner,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
  PageHeader,
  Spinner,
  StatusBadge,
  inputClass,
  selectClass,
} from '@/components/admin/ui';

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [blockTarget, setBlockTarget] = useState<AdminCustomerRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status });
      if (query) params.set('q', query);
      const res = await adminGet<AdminCustomerRow[]>(`/customers?${params.toString()}`);
      setRows(res.data);
      setMeta(res.meta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    window.history.replaceState(null, '', `/admin/customers${qs ? `?${qs}` : ''}`);
  }, [query, status, page]);

  async function toggleBlock() {
    if (!blockTarget) return;
    setBusy(true);
    setError('');
    const nextStatus = blockTarget.status === 'blocked' ? 'active' : 'blocked';
    try {
      await adminPatch(`/customers/${blockTarget._id}`, { status: nextStatus });
      setNotice(
        nextStatus === 'blocked'
          ? `${blockTarget.name} has been blocked and their sessions revoked.`
          : `${blockTarget.name} can sign in again.`,
      );
      setBlockTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the customer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="People"
        title="Customers"
        description="See who is buying, their contract value and account health. Blocking revokes active sessions immediately."
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Card>
        <div className="flex flex-col gap-2 border-b border-cream-200 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone or email…"
              aria-label="Search customers"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${selectClass} sm:w-44`}
            aria-label="Filter by account status"
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="pending">Pending</option>
          </select>
          <span className="text-[11px] font-semibold text-ink-900/40">{meta ? `${meta.total} customers` : ''}</span>
        </div>

        {loading ? (
          <Spinner label="Loading customers…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Customers appear here after registering or placing an order with their phone number."
            icon={<LuUsers className="h-5 w-5" />}
          />
        ) : (
          <div className="qb-scroll-x">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                  <th className="px-4 py-2.5 sm:pl-5">Customer</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5 text-center">Orders</th>
                  <th className="px-3 py-2.5 text-right">Advance booked</th>
                  <th className="px-3 py-2.5 text-right">Contract value</th>
                  <th className="px-3 py-2.5">Last order</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right sm:pr-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer._id} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60">
                    <td className="px-4 py-3 sm:pl-5">
                      <Link href={`/admin/customers/${customer._id}`} className="flex items-center gap-2.5 group">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-extrabold text-brand-700">
                          {customer.name
                            .split(' ')
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[190px] truncate text-xs font-bold text-ink-900 group-hover:text-brand-700">
                            {customer.name}
                          </span>
                          <span className="block text-[11px] text-ink-900/45">{customer.phone}</span>
                          {customer.email && <span className="block max-w-[190px] truncate text-[10px] text-ink-900/35">{customer.email}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={customer.role} />
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-ink-900">{customer.ordersCount}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-ink-900">
                      {formatRs(customer.totalSpend)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-ink-900/60">
                      {formatRs(customer.totalContractValue)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[11px] text-ink-900/55">
                      {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-3 py-3 sm:pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/customers/${customer._id}`}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-cream-300 px-2 text-[11px] font-bold text-ink-900 hover:border-brand-300 hover:text-brand-700"
                        >
                          <LuEye className="h-3 w-3" /> View
                        </Link>
                        <button
                          type="button"
                          onClick={() => setBlockTarget(customer)}
                          aria-label={customer.status === 'blocked' ? `Unblock ${customer.name}` : `Block ${customer.name}`}
                          className={
                            customer.status === 'blocked'
                              ? 'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cream-300 text-ink-900/40 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
                          }
                          title={customer.status === 'blocked' ? 'Unblock account' : 'Block account'}
                        >
                          {customer.status === 'blocked' ? <LuCheck className="h-3.5 w-3.5" /> : <LuBan className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} label="customers" />}
      </Card>

      <div className="flex items-center gap-2 text-[11px] text-ink-900/45">
        <LuX className="h-3.5 w-3.5" />
        Customer list includes registered customers and vendors. Guest checkout orders are matched by phone number.
      </div>

      <ConfirmDialog
        open={Boolean(blockTarget)}
        title={blockTarget?.status === 'blocked' ? 'Unblock this account?' : 'Block this account?'}
        message={
          blockTarget?.status === 'blocked' ? (
            <>
              <b>{blockTarget?.name}</b> will be able to log in and place orders again.
            </>
          ) : (
            <>
              <b>{blockTarget?.name}</b> will be signed out, cannot log in and cannot place new orders. Existing orders are
              kept for the record.
            </>
          )
        }
        confirmLabel={blockTarget?.status === 'blocked' ? 'Unblock account' : 'Block account'}
        tone={blockTarget?.status === 'blocked' ? 'primary' : 'danger'}
        busy={busy}
        onConfirm={() => void toggleBlock()}
        onClose={() => setBlockTarget(null)}
      />
    </div>
  );
}
