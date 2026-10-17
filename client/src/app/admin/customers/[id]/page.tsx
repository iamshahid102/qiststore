'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LuArrowLeft,
  LuBan,
  LuCheck,
  LuClipboardList,
  LuExternalLink,
  LuLoaderCircle,
  LuMail,
  LuPhone,
  LuShieldCheck,
  LuUser,
  LuWallet,
} from 'react-icons/lu';
import { adminGet, adminPatch } from '@/lib/admin-api';
import { parseAuth, useAuthRaw } from '@/lib/auth';
import { formatDate, formatRs } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/api';
import type { AdminCustomerDetail } from '@/types/admin';
import {
  Banner,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  StatCard,
  selectClass,
} from '@/components/admin/ui';

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const rawAuth = useAuthRaw();
  const currentUser = useMemo(() => parseAuth(rawAuth), [rawAuth]);

  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminGet<AdminCustomerDetail>(`/customers/${id}`);
      setData(res.data);
      setRole(res.data.customer.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleBlock() {
    if (!data) return;
    setBusy(true);
    setError('');
    const nextStatus = data.customer.status === 'blocked' ? 'active' : 'blocked';
    try {
      await adminPatch(`/customers/${data.customer._id}`, { status: nextStatus });
      setNotice(nextStatus === 'blocked' ? 'Account blocked and sessions revoked.' : 'Account unblocked.');
      setConfirmBlock(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the account');
    } finally {
      setBusy(false);
    }
  }

  async function saveRole() {
    if (!data || role === data.customer.role) return;
    setBusy(true);
    setError('');
    try {
      await adminPatch(`/customers/${data.customer._id}`, { role });
      setNotice(`Role updated to ${role}. The user must sign in again for the new role to take effect.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the role');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Loading customer…" />;

  if (error && !data) {
    return (
      <div className="space-y-4">
        <Banner tone="error">{error}</Banner>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <LuArrowLeft className="h-4 w-4" /> Back to customers
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { customer, stats, orders } = data;
  const isSelf = currentUser?.user.id === customer._id;
  const canChangeRole = currentUser?.user.role === 'admin' && !isSelf;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Customer profile"
        title={customer.name}
        description={`Joined ${formatDate(customer.createdAt)} · ${customer.verificationStatus.replace(/_/g, ' ')}`}
        actions={
          <>
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50"
            >
              <LuArrowLeft className="h-4 w-4" /> All customers
            </Link>
            <button
              type="button"
              onClick={() => setConfirmBlock(true)}
              className={
                customer.status === 'blocked'
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100'
              }
            >
              {customer.status === 'blocked' ? <LuCheck className="h-4 w-4" /> : <LuBan className="h-4 w-4" />}
              {customer.status === 'blocked' ? 'Unblock account' : 'Block account'}
            </button>
          </>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={customer.status} />
        <StatusBadge status={customer.role} />
        <StatusBadge status={customer.verificationStatus} />
        {customer.isPhoneVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            <LuShieldCheck className="h-3 w-3" /> Phone verified
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Advance booked"
          value={formatRs(stats.totalAdvance)}
          hint={`${stats.orders} order(s) total`}
          icon={<LuWallet className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Contract value"
          value={formatRs(stats.totalContractValue)}
          hint="All orders, full term"
          icon={<LuClipboardList className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Active orders"
          value={String(stats.activeOrders)}
          hint="Not completed / cancelled"
          icon={<LuClipboardList className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Last order"
          value={stats.lastOrderAt ? formatDate(stats.lastOrderAt) : '—'}
          hint={customer.lastLoginAt ? `Last login ${formatDate(customer.lastLoginAt)}` : 'No login recorded'}
          icon={<LuUser className="h-5 w-5" />}
          tone="ink"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Order history"
              subtitle={`${orders.length} order(s) linked by account or phone`}
              action={
                <Link href={`/admin/orders?q=${encodeURIComponent(customer.phone)}`} className="text-xs font-bold text-brand-700 hover:underline">
                  Open in orders
                </Link>
              }
            />
            {orders.length === 0 ? (
              <EmptyState
                title="No orders yet"
                description="This customer has not placed an order with this phone number or account."
                icon={<LuClipboardList className="h-5 w-5" />}
              />
            ) : (
              <div className="qb-scroll-x">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                      <th className="px-4 py-2.5 sm:px-5">Order</th>
                      <th className="px-3 py-2.5">Items</th>
                      <th className="px-3 py-2.5 text-right">Advance</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5">Placed</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 sm:pr-5" />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.orderNumber} className="border-b border-cream-100 last:border-0 hover:bg-cream-50/60">
                        <td className="px-4 py-2.5 sm:px-5">
                          <Link href={`/admin/orders/${order.orderNumber}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="max-w-[190px] truncate text-xs text-ink-900/70">{order.items[0]?.name ?? '—'}</p>
                          <p className="text-[11px] text-ink-900/40">{order.items[0]?.term}m plan</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold">{formatRs(order.pricing.totalAdvance)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-900/65">{formatRs(order.pricing.totalPayable)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-ink-900/55">{formatDate(order.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
                        </td>
                        <td className="px-3 py-2.5 text-right sm:pr-5">
                          <Link
                            href={`/admin/orders/${order.orderNumber}`}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-cream-300 px-2 text-[11px] font-bold text-ink-900 hover:border-brand-300 hover:text-brand-700"
                          >
                            <LuExternalLink className="h-3 w-3" /> Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Contact" />
            <div className="space-y-3 p-4 text-xs sm:p-5">
              <div className="flex items-center gap-2">
                <LuUser className="h-4 w-4 text-ink-900/35" />
                <span className="font-bold text-ink-900">{customer.name}</span>
              </div>
              <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-ink-900/65 hover:text-brand-700">
                <LuPhone className="h-4 w-4 text-ink-900/35" /> {customer.phone}
              </a>
              <div className="flex items-center gap-2 text-ink-900/65">
                <LuMail className="h-4 w-4 text-ink-900/35" /> {customer.email || 'No email on file'}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Access control" subtitle="Admin only" />
            <div className="space-y-3 p-4 sm:p-5">
              <Field label="Account status">
                <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2">
                  <StatusBadge status={customer.status} />
                  <button
                    type="button"
                    onClick={() => setConfirmBlock(true)}
                    className="text-[11px] font-bold text-brand-700 hover:underline"
                  >
                    {customer.status === 'blocked' ? 'Unblock' : 'Block'}
                  </button>
                </div>
              </Field>
              <Field label="Role" hint={isSelf ? 'You cannot change your own role.' : 'Changing a role invalidates the current refresh session.'}>
                <select value={role} onChange={(event) => setRole(event.target.value)} disabled={!canChangeRole} className={selectClass}>
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
              {canChangeRole && (
                <button
                  type="button"
                  onClick={() => void saveRole()}
                  disabled={busy || role === customer.role}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {busy && <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" />} Save role
                </button>
              )}
              {!canChangeRole && currentUser?.user.role !== 'admin' && (
                <p className="text-[11px] text-ink-900/45">Only a full administrator can change roles.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Account facts" />
            <dl className="space-y-2 p-4 text-xs sm:p-5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-900/50">Customer ID</dt>
                <dd className="truncate font-mono text-[11px] text-ink-900/70">{customer._id}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-900/50">Joined</dt>
                <dd className="font-semibold text-ink-900">{formatDate(customer.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-900/50">KYC status</dt>
                <dd><StatusBadge status={customer.verificationStatus} /></dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBlock}
        title={customer.status === 'blocked' ? 'Unblock this account?' : 'Block this account?'}
        message={
          customer.status === 'blocked' ? (
            <>
              <b>{customer.name}</b> will be able to log in and order again.
            </>
          ) : (
            <>
              <b>{customer.name}</b> will be signed out and blocked from logging in. Their order history stays intact.
            </>
          )
        }
        confirmLabel={customer.status === 'blocked' ? 'Unblock' : 'Block account'}
        tone={customer.status === 'blocked' ? 'primary' : 'danger'}
        busy={busy}
        onConfirm={() => void toggleBlock()}
        onClose={() => setConfirmBlock(false)}
      />
    </div>
  );
}
