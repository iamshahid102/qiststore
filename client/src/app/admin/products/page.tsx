'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LuArchive,
  LuCheck,
  LuChevronDown,
  LuPackage,
  LuPencil,
  LuPlus,
  LuSearch,
  LuStar,
  LuTrash2,
  LuX,
} from 'react-icons/lu';
import { adminDelete, adminGet, adminPatch } from '@/lib/admin-api';
import { formatRs } from '@/lib/format';
import type { PaginationMeta } from '@/types/api';
import type { AdminCategory, AdminProductRow } from '@/types/admin';
import {
  Banner,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
  PageHeader,
  Spinner,
  StatusBadge,
  cn,
  inputClass,
  selectClass,
} from '@/components/admin/ui';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Archived' },
];

export default function AdminProductsPage() {
  const [rows, setRows] = useState<AdminProductRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiveTarget, setArchiveTarget] = useState<AdminProductRow | null>(null);

  // Read deep-link filters once (dashboard links to ?stock=low).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s && STATUS_TABS.some((tab) => tab.value === s)) setStatus(s);
    const st = params.get('stock');
    if (st) setStock(st);
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
  }, [query, status, category, stock, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status, sort });
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      if (stock) params.set('stock', stock);
      const res = await adminGet<AdminProductRow[]>(`/products?${params.toString()}`);
      setRows(res.data);
      setMeta(res.meta ?? null);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, status, sort, query, category, stock]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminGet<AdminCategory[]>('/categories')
      .then((res) => setCategories(res.data))
      .catch(() => undefined);
  }, []);

  // Keep the URL shareable as filters change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status !== 'all') params.set('status', status);
    if (category) params.set('category', category);
    if (stock) params.set('stock', stock);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    window.history.replaceState(null, '', `/admin/products${qs ? `?${qs}` : ''}`);
  }, [query, status, category, stock, page]);

  const groupedCategories = useMemo(() => {
    const parents = categories.filter((c) => !c.parent);
    return parents.map((parent) => ({
      ...parent,
      children: categories.filter((c) => c.parent === parent.id),
    }));
  }, [categories]);

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkStatus(nextStatus: 'active' | 'inactive') {
    if (selected.size === 0) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await Promise.all([...selected].map((id) => adminPatch(`/products/${id}`, { status: nextStatus })));
      setNotice(
        `${selected.size} product(s) ${nextStatus === 'active' ? 'activated' : 'archived'} — storefront updated.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured(row: AdminProductRow) {
    setError('');
    setRows((current) => current.map((p) => (p.id === row.id ? { ...p, featured: !p.featured } : p)));
    try {
      await adminPatch(`/products/${row.id}`, { featured: !row.featured });
      setNotice(`${row.name} ${row.featured ? 'removed from' : 'added to'} featured products.`);
    } catch (err) {
      setRows((current) => current.map((p) => (p.id === row.id ? { ...p, featured: row.featured } : p)));
      setError(err instanceof Error ? err.message : 'Could not update featured flag');
    }
  }

  async function archive() {
    if (!archiveTarget) return;
    setBusy(true);
    setError('');
    try {
      await adminDelete(`/products/${archiveTarget.id}`);
      setNotice(`${archiveTarget.name} archived. It is now hidden from the storefront.`);
      setArchiveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Create, price, stock and publish products. Changes go live on the storefront immediately."
        actions={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-accent-600"
          >
            <LuPlus className="h-4 w-4" /> Add product
          </Link>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <Card>
        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-cream-200 px-3 pt-3 sm:px-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'relative rounded-t-lg px-3 py-2 text-xs font-bold transition',
                status === tab.value ? 'text-brand-700' : 'text-ink-900/50 hover:text-ink-900',
              )}
            >
              {tab.label}
              {status === tab.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
          <span className="ml-auto pb-2 pr-1 text-[11px] font-semibold text-ink-900/40">
            {meta ? `${meta.total} products` : ''}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2 border-b border-cream-200 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, SKU or slug…"
              className={`${inputClass} pl-9`}
              aria-label="Search products"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${selectClass} sm:w-44`} aria-label="Filter by category">
              <option value="">All categories</option>
              {groupedCategories.map((parent) => (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.slug}>{parent.name} (all)</option>
                  {parent.children.map((child) => (
                    <option key={child.id} value={child.slug}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={stock} onChange={(event) => setStock(event.target.value)} className={`${selectClass} sm:w-36`} aria-label="Filter by stock">
              <option value="">Any stock</option>
              <option value="low">Low stock (≤5)</option>
              <option value="out">Out of stock</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className={`${selectClass} sm:w-40`} aria-label="Sort products">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="price-asc">Cash price ↑</option>
              <option value="price-desc">Cash price ↓</option>
              <option value="stock">Stock ↑</option>
              <option value="popular">Best selling</option>
            </select>
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-xs">
            <span className="font-bold text-brand-800">{selected.size} selected</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkStatus('active')}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
            >
              <LuCheck className="h-3.5 w-3.5" /> Activate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => bulkStatus('inactive')}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-bold text-ink-900/70 ring-1 ring-cream-300 hover:bg-cream-50 disabled:opacity-50"
            >
              <LuArchive className="h-3.5 w-3.5" /> Archive
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
            >
              <LuX className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading products…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No products match these filters"
            description="Try clearing the search or category filter, or add a new product."
            icon={<LuPackage className="h-5 w-5" />}
            action={
              <Link href="/admin/products/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">
                <LuPlus className="h-3.5 w-3.5" /> Add product
              </Link>
            }
          />
        ) : (
          <div className="qb-scroll-x">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-cream-200 text-[10px] font-bold uppercase tracking-wider text-ink-900/40">
                  <th className="w-10 px-3 py-2.5 sm:pl-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all products"
                      className="h-3.5 w-3.5 rounded border-cream-300 accent-brand-600"
                    />
                  </th>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right">Cash price</th>
                  <th className="px-3 py-2.5 text-right">Advance</th>
                  <th className="px-3 py-2.5 text-center">Stock</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Featured</th>
                  <th className="px-3 py-2.5 text-right sm:pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={cn('border-b border-cream-100 last:border-0', selected.has(row.id) && 'bg-brand-50/40')}>
                    <td className="px-3 py-2.5 sm:pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.name}`}
                        className="h-3.5 w-3.5 rounded border-cream-300 accent-brand-600"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/products/${row.slug}`} className="flex items-center gap-2.5 group">
                        {row.imageUrl ? (
                          <Image
                            src={row.imageUrl}
                            alt={row.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-lg border border-cream-200 bg-cream-50 object-contain"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-[10px] font-bold text-ink-900/30">
                            N/A
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[240px] truncate text-xs font-bold text-ink-900 group-hover:text-brand-700">
                            {row.name}
                          </span>
                          <span className="block text-[11px] text-ink-900/40">
                            {row.sku} · {row.plans} plan{row.plans === 1 ? '' : 's'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-900/60">{row.category?.name ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold text-ink-900">
                      {formatRs(row.cashPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold text-brand-700">
                      {formatRs(row.minAdvance)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                          row.stock.qty === 0
                            ? 'bg-rose-50 text-rose-700'
                            : row.stock.qty <= 5
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-cream-100 text-ink-900/60',
                        )}
                        title={row.stock.status.replace(/_/g, ' ')}
                      >
                        {row.stock.qty}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(row)}
                        aria-label={row.featured ? 'Remove from featured' : 'Mark as featured'}
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-md transition',
                          row.featured ? 'bg-amber-100 text-amber-600' : 'text-ink-900/25 hover:bg-cream-100 hover:text-amber-500',
                        )}
                      >
                        <LuStar className={row.featured ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
                      </button>
                    </td>
                    <td className="px-3 py-2.5 sm:pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${row.slug}`}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-cream-300 px-2 text-[11px] font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700"
                        >
                          <LuPencil className="h-3 w-3" /> Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(row)}
                          disabled={row.status === 'inactive'}
                          aria-label={`Archive ${row.name}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cream-300 text-ink-900/45 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        >
                          <LuTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} label="products" />}
      </Card>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-900/45">
        <LuChevronDown className="h-3.5 w-3.5" />
        Archiving hides a product from the storefront but keeps it in past orders. Permanent deletion is available inside
        the product editor.
      </div>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive this product?"
        message={
          <>
            <b>{archiveTarget?.name}</b> will be hidden from the storefront immediately. Existing order history is not
            affected. You can re-activate it any time.
          </>
        }
        confirmLabel="Archive product"
        busy={busy}
        onConfirm={archive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
