'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { LuChevronLeft, LuChevronRight, LuLoaderCircle, LuTriangleAlert, LuX } from 'react-icons/lu';

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------------- */
/* Layout primitives                                                          */
/* ------------------------------------------------------------------------- */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-600">{eyebrow}</p>
        )}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-900/60">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-cream-200/90 bg-white shadow-[0_1px_2px_rgba(11,27,57,0.04),0_16px_34px_-26px_rgba(11,27,57,0.35)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-200 px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-xs text-ink-900/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: 'brand' | 'accent' | 'emerald' | 'ink';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-100 text-accent-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    ink: 'bg-ink-900 text-white',
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-900/45">{label}</p>
          <p className="mt-2 truncate text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-ink-900/50">{hint}</p>}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/* Status badge                                                               */
/* ------------------------------------------------------------------------- */
const STATUS_STYLES: Record<string, string> = {
  pending_verification: 'bg-amber-50 text-amber-700 ring-amber-200',
  verification_in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  processing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  shipped: 'bg-violet-50 text-violet-700 ring-violet-200',
  delivered: 'bg-teal-50 text-teal-700 ring-teal-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  defaulted: 'bg-rose-100 text-rose-800 ring-rose-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  upcoming: 'bg-slate-100 text-slate-600 ring-slate-200',
  due: 'bg-sky-50 text-sky-700 ring-sky-200',
  waived: 'bg-slate-100 text-slate-600 ring-slate-200',
  not_submitted: 'bg-slate-100 text-slate-600 ring-slate-200',
  in_review: 'bg-sky-50 text-sky-700 ring-sky-200',
  in_stock: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  out_of_stock: 'bg-rose-50 text-rose-700 ring-rose-200',
  pre_order: 'bg-amber-50 text-amber-700 ring-amber-200',
  admin: 'bg-brand-50 text-brand-700 ring-brand-200',
  staff: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  customer: 'bg-slate-100 text-slate-600 ring-slate-200',
  vendor: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
      )}
    >
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------------- */
/* Form controls                                                              */
/* ------------------------------------------------------------------------- */
export const inputClass =
  'w-full rounded-xl border border-cream-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-900/35 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-cream-50 disabled:text-ink-900/50';

export const selectClass = `${inputClass} pr-8`;

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-bold text-ink-900/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-900/45">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------------- */
/* Feedback                                                                   */
/* ------------------------------------------------------------------------- */
export function Banner({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-brand-200 bg-brand-50 text-brand-700',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-xl border px-3 py-2 text-sm', tones[tone])}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100 text-ink-900/40">{icon}</div>}
      <p className="text-sm font-bold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-ink-900/50">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-900/50">
      <LuLoaderCircle className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* ------------------------------------------------------------------------- */
export function Pagination({
  page,
  pages,
  total,
  onPage,
  label = 'records',
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 px-4 py-3 text-xs text-ink-900/60 sm:px-5">
      <p>
        Page <span className="font-bold text-ink-900">{page}</span> of{' '}
        <span className="font-bold text-ink-900">{Math.max(1, pages)}</span> · {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-cream-300 px-2.5 font-semibold text-ink-900 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LuChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-cream-300 px-2.5 font-semibold text-ink-900 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <LuChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Confirm dialog                                                             */
/* ------------------------------------------------------------------------- */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600',
            )}
          >
            <LuTriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink-900">{title}</h3>
            <div className="mt-1 text-xs leading-relaxed text-ink-900/60">{message}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ml-auto -mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-ink-900/40 hover:bg-cream-100"
            aria-label="Close"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-cream-300 px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition disabled:opacity-60',
              tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700',
            )}
          >
            {busy && <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
