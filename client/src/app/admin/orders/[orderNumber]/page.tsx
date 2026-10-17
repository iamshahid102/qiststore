'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  LuArrowLeft,
  
  LuBanknote,
  LuCheck,
  LuCircleCheck,
  LuCircleX,
  
  LuCreditCard,
  LuExternalLink,
  LuFileText,
  LuLoaderCircle,
  LuMapPin,
  
  LuSave,
  
  LuTruck,
  LuUser,
  LuX,
} from 'react-icons/lu';
import { adminGet, adminPatch } from '@/lib/admin-api';
import { formatDate, formatRs } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/api';
import { PAYMENT_METHOD_LABELS, type AdminOrderDetail, type AdminScheduleEntry } from '@/types/admin';
import {
  Banner,
  Card,
  CardHeader,
  Field,
  PageHeader,
  Spinner,
  StatusBadge,
  cn,
  inputClass,
  selectClass,
} from '@/components/admin/ui';

const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params?.orderNumber;
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState('');

  const [paymentTarget, setPaymentTarget] = useState<AdminScheduleEntry | null>(null);

  const load = useCallback(async () => {
    if (!orderNumber) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminGet<AdminOrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`);
      setOrder(res.data);
      setNotes(res.data.notes ?? '');
      setNextStatus(res.data.allowedTransitions[0] ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function updateStatus() {
    if (!order || !nextStatus) return;
    return run(
      () => adminPatch(`/orders/${order.orderNumber}/status`, { status: nextStatus, note: statusNote || undefined }),
      `Order moved to ${ORDER_STATUS_LABELS[nextStatus] ?? nextStatus}.`,
    ).then(() => setStatusNote(''));
  }

  function approveVerification() {
    if (!order) return;
    return run(
      () => adminPatch(`/orders/${order.orderNumber}/verification`, { decision: 'approved' }),
      'Verification approved. The order is ready for processing.',
    );
  }

  function rejectVerification() {
    if (!order) return;
    if (!rejectReason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    return run(
      () => adminPatch(`/orders/${order.orderNumber}/verification`, { decision: 'rejected', reason: rejectReason.trim() }),
      'Verification rejected and the customer timeline updated.',
    ).then(() => {
      setRejectOpen(false);
      setRejectReason('');
    });
  }

  function saveNotes() {
    if (!order) return;
    return run(
      () => adminPatch(`/orders/${order.orderNumber}/notes`, { notes }),
      'Internal notes saved.',
    );
  }

  if (loading) return <Spinner label="Loading order…" />;

  if (error && !order) {
    return (
      <div className="space-y-4">
        <Banner tone="error">{error}</Banner>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          <LuArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const totalUnits = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Order detail"
        title={order.orderNumber}
        description={`Placed ${fmtDateTime(order.createdAt)} · ${totalUnits} unit(s) · ${PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}`}
        actions={
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50"
          >
            <LuArrowLeft className="h-4 w-4" /> All orders
          </Link>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
        <StatusBadge status={order.verification.status} />
        {order.user && (
          <Link
            href={`/admin/customers/${order.user._id}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100"
          >
            Registered customer <LuExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Items */}
          <Card>
            <CardHeader title="Items" subtitle={`${order.items.length} line item(s)`} />
            <div className="qb-scroll-x">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                    <th className="px-4 py-2.5 sm:px-5">Product</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-center">Term</th>
                    <th className="px-3 py-2.5 text-right">Advance</th>
                    <th className="px-3 py-2.5 text-right">Monthly</th>
                    <th className="px-3 py-2.5 text-right sm:pr-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${item.product}-${index}`} className="border-b border-cream-100 last:border-0">
                      <td className="px-4 py-3 sm:px-5">
                        {item.slug ? (
                          <Link href={`/admin/products/${item.slug}`} className="text-xs font-bold text-brand-700 hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          <span className="text-xs font-bold text-ink-900">{item.name}</span>
                        )}
                        <p className="text-[11px] text-ink-900/40">Cash snapshot: {formatRs(item.cashPriceSnapshot)}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-xs">{item.qty}</td>
                      <td className="px-3 py-3 text-center text-xs">{item.term} mo</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold">{formatRs(item.advanceSnapshot)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs">{formatRs(item.monthlySnapshot)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold sm:pr-5">
                        {formatRs(item.totalPayableSnapshot)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 border-t border-cream-200 bg-cream-50/60 p-4 text-xs sm:grid-cols-3 sm:p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-900/40">Advance due</p>
                <p className="mt-0.5 text-base font-extrabold text-ink-900">{formatRs(order.pricing.totalAdvance)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-900/40">Per month</p>
                <p className="mt-0.5 text-base font-extrabold text-ink-900">{formatRs(order.pricing.totalMonthlyPerMonth)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-900/40">Total contract</p>
                <p className="mt-0.5 text-base font-extrabold text-brand-700">{formatRs(order.pricing.totalPayable)}</p>
              </div>
            </div>
          </Card>

          {/* Installments */}
          <Card>
            <CardHeader
              title="Installment schedule"
              subtitle={`Collected ${formatRs(order.payments.collected)} · Remaining ${formatRs(Math.max(0, order.payments.remaining))}`}
            />
            {order.schedule.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-900/50">No installment schedule on this order.</p>
            ) : (
              <div className="qb-scroll-x">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                      <th className="px-4 py-2.5 sm:px-5">#</th>
                      <th className="px-3 py-2.5">Due date</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5 text-right">Paid</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 sm:pr-5">Reference</th>
                      <th className="px-3 py-2.5 sm:pr-5" />
                    </tr>
                  </thead>
                  <tbody>
                    {order.schedule.map((entry) => (
                      <tr key={entry.installmentNo} className="border-b border-cream-100 last:border-0">
                        <td className="px-4 py-2.5 text-xs font-bold text-ink-900 sm:px-5">{entry.installmentNo}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-900/65">{formatDate(entry.dueDate)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold">{formatRs(entry.amount)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-900/65">
                          {entry.paidAmount ? formatRs(entry.paidAmount) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-ink-900/45">
                          {entry.method || entry.txnRef ? `${entry.method ?? ''} ${entry.txnRef ?? ''}`.trim() : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right sm:pr-5">
                          <button
                            type="button"
                            onClick={() => setPaymentTarget(entry)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-cream-300 px-2 text-[11px] font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700"
                          >
                            <LuBanknote className="h-3 w-3" /> {entry.status === 'paid' ? 'Edit' : 'Record'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader title="Activity timeline" subtitle="Every status change is recorded" />
            <ol className="space-y-0 px-4 py-4 sm:px-5">
              {[...order.timeline].reverse().map((event, index) => (
                <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {index !== order.timeline.length - 1 && (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-cream-300" aria-hidden />
                  )}
                  <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand-500 bg-white" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-900">
                      {ORDER_STATUS_LABELS[event.status] ?? event.status.replace(/_/g, ' ')}
                    </p>
                    {event.note && <p className="text-[11px] text-ink-900/60">{event.note}</p>}
                    <p className="text-[10px] text-ink-900/35">{fmtDateTime(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Internal notes" subtitle="Visible to staff only" />
            <div className="space-y-2 p-4 sm:p-5">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Call summary, delivery preference, guarantor notes…"
                className={inputClass}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void saveNotes()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  <LuSave className="h-3.5 w-3.5" /> Save notes
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Status workflow */}
          <Card>
            <CardHeader title="Order workflow" subtitle="Only legal transitions are offered" />
            <div className="space-y-3 p-4 sm:p-5">
              {order.allowedTransitions.length === 0 ? (
                <p className="text-xs text-ink-900/50">
                  This order is in a final state ({ORDER_STATUS_LABELS[order.status] ?? order.status}). No further
                  transitions are allowed.
                </p>
              ) : (
                <>
                  <Field label="Move to">
                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className={selectClass}>
                      {order.allowedTransitions.map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Note (optional)">
                    <input
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      className={inputClass}
                      placeholder="e.g. Rider assigned, tracking #…"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => void updateStatus()}
                    disabled={busy || !nextStatus}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busy ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuTruck className="h-4 w-4" />}
                    Update status
                  </button>
                </>
              )}

              <div className="rounded-xl bg-cream-50 p-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">Next steps</p>
                <div className="flex flex-wrap gap-1">
                  {order.allowedTransitions.length === 0 ? (
                    <span className="text-[11px] text-ink-900/45">None</span>
                  ) : (
                    order.allowedTransitions.map((status) => (
                      <span key={status} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-900/60 ring-1 ring-cream-200">
                        {ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Verification */}
          <Card>
            <CardHeader title="Verification" subtitle="CNIC & guarantor review" />
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-900/60">Decision</span>
                <StatusBadge status={order.verification.status} />
              </div>
              {order.verification.customer?.cnicNo && (
                <p className="text-xs text-ink-900/60">
                  CNIC: <b className="text-ink-900">{order.verification.customer.cnicNo}</b>
                </p>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ['CNIC front', order.verification.customer?.cnicFrontUrl],
                  ['CNIC back', order.verification.customer?.cnicBackUrl],
                  ['Selfie', order.verification.customer?.selfieUrl],
                ].map(([label, url]) =>
                  url ? (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-1 rounded-lg border border-cream-200 px-1 py-2 text-[10px] font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      <LuFileText className="h-4 w-4" /> {label}
                    </a>
                  ) : (
                    <span key={label} className="rounded-lg border border-dashed border-cream-200 px-1 py-2 text-center text-[10px] text-ink-900/30">
                      {label}
                    </span>
                  ),
                )}
              </div>
              {order.verification.rejectionReason && (
                <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700">
                  Rejection reason: {order.verification.rejectionReason}
                </p>
              )}
              {order.verification.reviewedBy && (
                <p className="text-[10px] text-ink-900/40">
                  Reviewed by {order.verification.reviewedBy.name} · {fmtDateTime(order.verification.approvedAt)}
                </p>
              )}

              {(order.status === 'pending_verification' || order.status === 'verification_in_progress') && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void approveVerification()}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <LuCircleCheck className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectOpen(true)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <LuCircleX className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}

              {rejectOpen && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5">
                  <Field label="Rejection reason *">
                    <textarea
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      rows={2}
                      className={inputClass}
                      placeholder="CNIC photo is unreadable…"
                    />
                  </Field>
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRejectOpen(false)}
                      className="rounded-full px-3 py-1.5 text-[11px] font-bold text-ink-900/60 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void rejectVerification()}
                      disabled={busy}
                      className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Customer & shipping */}
          <Card>
            <CardHeader title="Customer" />
            <div className="space-y-3 p-4 text-xs sm:p-5">
              <div className="flex items-start gap-2">
                <LuUser className="mt-0.5 h-4 w-4 shrink-0 text-ink-900/35" />
                <div>
                  <p className="font-bold text-ink-900">{order.customer.name}</p>
                  <p className="text-ink-900/50">{order.customer.phone}</p>
                  {order.customer.email && <p className="text-ink-900/50">{order.customer.email}</p>}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <LuMapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-900/35" />
                <p className="leading-relaxed text-ink-900/65">
                  {[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.area, order.shippingAddress?.city]
                    .filter(Boolean)
                    .join(', ') || 'No address captured'}
                  {order.shippingAddress?.postalCode ? ` — ${order.shippingAddress.postalCode}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LuCreditCard className="h-4 w-4 shrink-0 text-ink-900/35" />
                <p className="text-ink-900/65">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
              </div>
              {order.user && (
                <Link
                  href={`/admin/customers/${order.user._id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                >
                  Open customer profile <LuExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment summary" />
            <div className="space-y-2 p-4 text-xs sm:p-5">
              <div className="flex justify-between">
                <span className="text-ink-900/55">Advance due</span>
                <b>{formatRs(order.pricing.totalAdvance)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-900/55">Installments collected</span>
                <b className="text-emerald-700">{formatRs(order.payments.collected)}</b>
              </div>
              <div className="flex justify-between border-t border-cream-200 pt-2">
                <span className="font-bold text-ink-900">Remaining contract</span>
                <b className="text-brand-700">{formatRs(Math.max(0, order.payments.remaining))}</b>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {paymentTarget && order && (
        <PaymentDialog
          entry={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSave={async (payload) => {
            await run(
              () => adminPatch(`/orders/${order.orderNumber}/schedule/${paymentTarget.installmentNo}`, payload),
              `Installment #${paymentTarget.installmentNo} updated.`,
            );
            setPaymentTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Payment dialog                                                            */
/* ------------------------------------------------------------------------- */
function PaymentDialog({
  entry,
  onClose,
  onSave,
}: {
  entry: AdminScheduleEntry;
  onClose: () => void;
  onSave: (payload: { status: string; paidAmount?: number; method?: string; txnRef?: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<'paid' | 'partial' | 'upcoming'>('paid');
  const [amount, setAmount] = useState(entry.paidAmount ? String(entry.paidAmount / 100) : String(entry.amount / 100));
  const [method, setMethod] = useState(entry.method ?? 'cash');
  const [txnRef, setTxnRef] = useState(entry.txnRef ?? '');
  const [busy, setBusy] = useState(false);

  const partialAmount = Math.round(Number.parseFloat(amount) * 100);

  async function submit() {
    setBusy(true);
    try {
      await onSave({
        status: mode,
        ...(mode === 'partial' ? { paidAmount: partialAmount } : {}),
        ...(mode !== 'upcoming' ? { method, txnRef: txnRef || undefined } : {}),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Installment #{entry.installmentNo}</h3>
            <p className="text-[11px] text-ink-900/50">
              Due {formatDate(entry.dueDate)} · {formatRs(entry.amount)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-900/40 hover:bg-cream-100" aria-label="Close dialog">
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Action">
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className={selectClass}>
              <option value="paid">Mark as fully paid</option>
              <option value="partial">Record partial payment</option>
              <option value="upcoming">Reset to upcoming</option>
            </select>
          </Field>

          {mode === 'partial' && (
            <Field label="Amount received (PKR)">
              <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} />
            </Field>
          )}

          {mode !== 'upcoming' && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Method">
                <select value={method} onChange={(event) => setMethod(event.target.value)} className={selectClass}>
                  <option value="cash">Cash</option>
                  <option value="easypaisa">Easypaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </Field>
              <Field label="Reference">
                <input value={txnRef} onChange={(event) => setTxnRef(event.target.value)} className={inputClass} placeholder="TXN-…" />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-300 px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || (mode === 'partial' && (partialAmount <= 0 || partialAmount >= entry.amount))}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LuCheck className="h-3.5 w-3.5" />}
            Save payment
          </button>
        </div>
      </div>
    </div>
  );
}
