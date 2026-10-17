'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LuArrowDown,
  LuArrowUp,
  LuImagePlus,
  LuLoaderCircle,
  LuPlus,
  LuSave,
  LuTrash2,
  LuUpload,
  LuX,
} from 'react-icons/lu';
import { adminDelete, adminGet, adminPatch, adminPost, adminUpload } from '@/lib/admin-api';
import { formatRs } from '@/lib/format';
import type { AdminBrand, AdminCategory, AdminProduct, AdminProductImage } from '@/types/admin';
import { TERM_OPTIONS } from '@/types/admin';
import {
  Banner,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  PageHeader,
  cn,
  inputClass,
  selectClass,
} from '@/components/admin/ui';

const TAG_OPTIONS = [
  { value: 'deal-of-day', label: 'Deal of the day' },
  { value: 'special-offer', label: 'Special offer' },
  { value: 'instant-delivery', label: 'Instant delivery' },
  { value: 'featured', label: 'Featured' },
];

interface PlanRow {
  term: number;
  advance: string;
  monthly: string;
  isActive: boolean;
}

interface ImageRow {
  url: string;
  alt: string;
  publicId?: string;
}

const toPaisa = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

const toRupees = (paisa: number): string => (paisa ? String(Math.round(paisa) / 100) : '');

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [category, setCategory] = useState(
    product && typeof product.category === 'object' && product.category
      ? product.category._id
      : String(product?.category ?? ''),
  );
  const [brand, setBrand] = useState(
    product && typeof product.brand === 'object' && product.brand
      ? product.brand._id
      : String(product?.brand ?? ''),
  );
  const [vendorName, setVendorName] = useState(product?.vendorName ?? 'Qist Store Fulfilment');
  const [description, setDescription] = useState(product?.description ?? '');
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join('\n'));
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product?.specs?.length ? product.specs.map((s) => ({ key: s.key, value: s.value })) : [{ key: '', value: '' }],
  );
  const [cashPrice, setCashPrice] = useState(toRupees(product?.cashPrice ?? 0));
  const [plans, setPlans] = useState<PlanRow[]>(
    product?.plans?.length
      ? [...product.plans]
          .sort((a, b) => a.term - b.term)
          .map((p) => ({ term: p.term, advance: toRupees(p.advance), monthly: toRupees(p.monthly), isActive: p.isActive !== false }))
      : [
          { term: 6, advance: '', monthly: '', isActive: true },
          { term: 12, advance: '', monthly: '', isActive: true },
          { term: 18, advance: '', monthly: '', isActive: true },
        ],
  );
  const [images, setImages] = useState<ImageRow[]>(
    (product?.images ?? []).map((img: AdminProductImage) => ({ url: img.url, alt: img.alt ?? '', publicId: img.publicId })),
  );
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [stockQty, setStockQty] = useState(String(product?.stock?.qty ?? 20));
  const [trackStock, setTrackStock] = useState(product?.stock?.track !== false);
  const [stockStatus, setStockStatus] = useState(product?.stock?.status ?? 'in_stock');
  const [warranty, setWarranty] = useState<string>(product?.warranty ?? 'company');
  const [freeDelivery, setFreeDelivery] = useState(product?.delivery?.free !== false);
  const [instantCities, setInstantCities] = useState((product?.delivery?.instantCities ?? ['Karachi', 'Lahore']).join(', '));

  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [status, setStatus] = useState<string>(product?.status ?? 'active');
  const [featured, setFeatured] = useState(product?.featured ?? false);

  const [seoTitle, setSeoTitle] = useState(product?.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(product?.seo?.description ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminGet<AdminCategory[]>('/categories'), adminGet<AdminBrand[]>('/brands')])
      .then(([cats, brandRes]) => {
        if (cancelled) return;
        setCategories(cats.data);
        setBrands(brandRes.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parent)
      .map((parent) => ({ ...parent, children: categories.filter((c) => c.parent === parent.id) }));
  }, [categories]);

  const cashPaisa = toPaisa(cashPrice);
  const minAllowedAdvance = Math.floor(cashPaisa * 0.1);
  const bestPlan = useMemo(() => {
    let lowest = Number.POSITIVE_INFINITY;
    for (const plan of plans) {
      const advance = toPaisa(plan.advance);
      if (plan.isActive && advance > 0) lowest = Math.min(lowest, advance);
    }
    return Number.isFinite(lowest) ? lowest : 0;
  }, [plans]);

  function addPlan() {
    const used = new Set(plans.map((p) => p.term));
    const nextTerm = TERM_OPTIONS.find((term) => !used.has(term)) ?? 24;
    setPlans((current) => [...current, { term: nextTerm, advance: '', monthly: '', isActive: true }]);
  }

  function removePlan(index: number) {
    setPlans((current) => current.filter((_, i) => i !== index));
  }

  function updatePlan(index: number, patch: Partial<PlanRow>) {
    setPlans((current) => current.map((plan, i) => (i === index ? { ...plan, ...patch } : plan)));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      const uploaded: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const asset = await adminUpload(file);
        uploaded.push({ url: asset.url, publicId: asset.publicId, alt: name });
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setUploadError(
        `${err instanceof Error ? err.message : 'Upload failed'} — you can still paste an image URL below.`,
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      setUploadError('Image URL must start with http:// or https://');
      return;
    }
    try {
      const host = new URL(url).hostname;
      if (!host.endsWith('cloudinary.com') && host !== 'localhost' && host !== '127.0.0.1') {
        setUploadError(
          'The storefront image optimiser only allows Cloudinary (or localhost) URLs. Upload the file instead.',
        );
        return;
      }
    } catch {
      setUploadError('That image URL is not valid.');
      return;
    }
    setImages((current) => [...current, { url, alt: name }]);
    setImageUrl('');
    setUploadError('');
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  function validate(): string | null {
    if (name.trim().length < 2) return 'Product name must be at least 2 characters.';
    if (cashPaisa <= 0) return 'Enter a valid cash price.';
    if (plans.length === 0) return 'Add at least one installment plan.';
    if (new Set(plans.map((p) => p.term)).size !== plans.length) return 'Each plan must use a different term.';
    for (const plan of plans) {
      if (!TERM_OPTIONS.includes(plan.term)) return `Unsupported term: ${plan.term}`;
      if (toPaisa(plan.monthly) <= 0) return `Monthly payment for the ${plan.term}-month plan must be greater than 0.`;
      if (toPaisa(plan.advance) < minAllowedAdvance) {
        return `The ${plan.term}-month advance cannot be below 10% of the cash price (${formatRs(minAllowedAdvance)}).`;
      }
      if (toPaisa(plan.advance) >= cashPaisa * 2) return `The ${plan.term}-month advance is too high.`;
    }
    return null;
  }

  async function save() {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      sku: sku.trim(),
      category: category || null,
      brand: brand || null,
      vendorName: vendorName.trim() || 'Qist Store Fulfilment',
      description: description.trim(),
      highlights: highlights
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      specs: specs.map((s) => ({ key: s.key.trim(), value: s.value.trim() })).filter((s) => s.key && s.value),
      images: images.map((img, index) => ({ url: img.url, alt: img.alt || name, sort: index })),
      cashPrice: cashPaisa,
      plans: [...plans]
        .sort((a, b) => a.term - b.term)
        .map((plan, index) => ({
          term: plan.term,
          advance: toPaisa(plan.advance),
          monthly: toPaisa(plan.monthly),
          isActive: plan.isActive,
          sortOrder: index,
        })),
      stock: {
        qty: Math.max(0, Number.parseInt(stockQty, 10) || 0),
        track: trackStock,
        status: stockStatus,
      },
      tags,
      status,
      featured,
      warranty,
      delivery: {
        free: freeDelivery,
        instantCities: instantCities
          .split(',')
          .map((city) => city.trim())
          .filter(Boolean),
      },
      seo: { title: seoTitle.trim(), description: seoDescription.trim() },
    };

    try {
      if (isEdit && product) {
        await adminPatch(`/products/${product._id}`, payload);
        setNotice('Product saved. Storefront updated.');
        router.refresh();
      } else {
        await adminPost('/products', payload);
        router.push('/admin/products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  async function permanentDelete() {
    if (!product) return;
    setDeleting(true);
    setError('');
    try {
      await adminDelete(`/products/${product._id}?permanent=true`);
      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        eyebrow="Catalogue"
        title={isEdit ? 'Edit product' : 'Add product'}
        description={
          isEdit
            ? `Update ${product?.name}. Changes are live on the storefront as soon as you save.`
            : 'Create a new installment product. Slugs and SKUs are generated automatically when left blank.'
        }
        actions={
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50"
          >
            Back to products
          </button>
        }
      />

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Basic info */}
          <Card>
            <CardHeader title="Basic information" subtitle="What shoppers see first" />
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              <Field label="Product name *" className="sm:col-span-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Infinix Hot 60i | 6GB-128GB" />
              </Field>
              <Field label="Slug" hint="Leave blank to generate from the name">
                <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass} placeholder="infinix-hot-60i" />
              </Field>
              <Field label="SKU" hint="Leave blank to auto-generate">
                <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} placeholder="QS-INFINIX-HOT-60I" />
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} disabled={refsLoading}>
                  <option value="">Uncategorised</option>
                  {groupedCategories.map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name}</option>
                      {parent.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass} disabled={refsLoading}>
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fulfilment / vendor label">
                <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Publish state">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                  <option value="active">Active (live)</option>
                  <option value="draft">Draft (hidden)</option>
                  <option value="inactive">Archived</option>
                </select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl border border-cream-300 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-cream-300 accent-brand-600"
                />
                <span className="text-xs font-bold text-ink-900/75">Show as featured product</span>
              </label>
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader
              title="Pricing & installment plans"
              subtitle="Advance and monthly amounts are set per term"
              action={
                <button
                  type="button"
                  onClick={addPlan}
                  disabled={plans.length >= TERM_OPTIONS.length}
                  className="inline-flex items-center gap-1 rounded-full border border-cream-300 px-3 py-1.5 text-[11px] font-bold text-ink-900 hover:border-brand-300 hover:text-brand-700 disabled:opacity-40"
                >
                  <LuPlus className="h-3.5 w-3.5" /> Add plan
                </button>
              }
            />
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cash price (PKR) *" hint={`Minimum advance across plans: ${bestPlan ? formatRs(bestPlan) : '—'}`}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    className={inputClass}
                    placeholder="42999"
                  />
                </Field>
                <div className="rounded-xl bg-cream-50 p-3 text-xs text-ink-900/60">
                  <p className="font-bold text-ink-900">Profit guardrails</p>
                  <p className="mt-1 leading-relaxed">
                    Every advance must cover at least 10% of the cash price ({formatRs(minAllowedAdvance)}). Invalid plans
                    are rejected by the API before saving.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {plans.map((plan, index) => {
                  const advance = toPaisa(plan.advance);
                  const monthly = toPaisa(plan.monthly);
                  const total = advance + monthly * plan.term;
                  const margin = cashPaisa > 0 ? total - cashPaisa : 0;
                  const lowAdvance = cashPaisa > 0 && advance < minAllowedAdvance;
                  return (
                    <div key={index} className="rounded-xl border border-cream-200 p-3">
                      <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_auto] sm:items-end">
                        <Field label="Term">
                          <select
                            value={plan.term}
                            onChange={(e) => updatePlan(index, { term: Number(e.target.value) })}
                            className={selectClass}
                          >
                            {TERM_OPTIONS.map((term) => (
                              <option key={term} value={term}>
                                {term} months
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Advance (PKR)">
                          <input
                            type="number"
                            min="0"
                            value={plan.advance}
                            onChange={(e) => updatePlan(index, { advance: e.target.value })}
                            className={cn(inputClass, lowAdvance && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
                            placeholder="10500"
                          />
                        </Field>
                        <Field label="Monthly (PKR)">
                          <input
                            type="number"
                            min="0"
                            value={plan.monthly}
                            onChange={(e) => updatePlan(index, { monthly: e.target.value })}
                            className={inputClass}
                            placeholder="2150"
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removePlan(index)}
                          disabled={plans.length === 1}
                          className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 text-ink-900/40 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          aria-label={`Remove ${plan.term}-month plan`}
                        >
                          <LuTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-900/55">
                        <span>
                          Total payable: <b className="text-ink-900">{formatRs(total)}</b>
                        </span>
                        <span>
                          Markup: <b className={margin < 0 ? 'text-rose-600' : 'text-ink-900'}>{formatRs(margin)}</b>
                        </span>
                        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                          <input
                            type="checkbox"
                            checked={plan.isActive}
                            onChange={(e) => updatePlan(index, { isActive: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-cream-300 accent-brand-600"
                          />
                          Visible to customers
                        </label>
                      </div>
                      {lowAdvance && (
                        <p className="mt-1 text-[11px] font-semibold text-rose-600">
                          Advance is below the 10% minimum ({formatRs(minAllowedAdvance)}).
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader
              title="Product photos"
              subtitle="First image is used as the listing thumbnail"
              action={
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {uploading ? <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LuUpload className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              }
            />
            <div className="space-y-3 p-4 sm:p-5">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={(event) => void uploadFiles(event.target.files)}
              />

              {uploadError && <Banner tone="error">{uploadError}</Banner>}

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cream-300 bg-cream-50/50 px-4 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <LuImagePlus className="h-7 w-7 text-ink-900/25" />
                  <span className="text-xs font-bold text-ink-900/60">Click to upload product photos</span>
                  <span className="text-[11px] text-ink-900/40">JPG, PNG, WebP or AVIF · max 5 MB each</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((image, index) => (
                    <div key={`${image.url}-${index}`} className="group relative overflow-hidden rounded-xl border border-cream-200 bg-cream-50">
                      <div className="relative aspect-square">
                        <Image src={image.url} alt={image.alt || name} fill sizes="180px" className="object-contain p-2" />
                      </div>
                      {index === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink-900/70 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            className="flex h-6 w-6 items-center justify-center rounded text-white/80 hover:bg-white/20 disabled:opacity-30"
                            aria-label="Move image left"
                          >
                            <LuArrowUp className="h-3 w-3 -rotate-90" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === images.length - 1}
                            className="flex h-6 w-6 items-center justify-center rounded text-white/80 hover:bg-white/20 disabled:opacity-30"
                            aria-label="Move image right"
                          >
                            <LuArrowDown className="h-3 w-3 -rotate-90" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                          className="flex h-6 w-6 items-center justify-center rounded text-white/80 hover:bg-rose-500"
                          aria-label="Remove image"
                        >
                          <LuX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className={inputClass}
                  placeholder="Or paste a Cloudinary image URL (https://res.cloudinary.com/…)"
                />
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="shrink-0 rounded-xl border border-cream-300 px-4 py-2 text-xs font-bold text-ink-900 hover:border-brand-300 hover:text-brand-700"
                >
                  Add URL
                </button>
              </div>
            </div>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader title="Description & specifications" subtitle="Shown on the product page" />
            <div className="space-y-3 p-4 sm:p-5">
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} />
              </Field>
              <Field label="Highlights" hint="One bullet per line">
                <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} className={inputClass} />
              </Field>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900/70">Specifications</span>
                  <button
                    type="button"
                    onClick={() => setSpecs((current) => [...current, { key: '', value: '' }])}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                  >
                    <LuPlus className="h-3 w-3" /> Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {specs.map((spec, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={spec.key}
                        onChange={(e) =>
                          setSpecs((current) => current.map((row, i) => (i === index ? { ...row, key: e.target.value } : row)))
                        }
                        className={inputClass}
                        placeholder="RAM"
                      />
                      <input
                        value={spec.value}
                        onChange={(e) =>
                          setSpecs((current) => current.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))
                        }
                        className={inputClass}
                        placeholder="6 GB"
                      />
                      <button
                        type="button"
                        onClick={() => setSpecs((current) => current.filter((_, i) => i !== index))}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cream-300 text-ink-900/40 hover:border-rose-300 hover:text-rose-600"
                        aria-label="Remove specification"
                      >
                        <LuTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Inventory" />
            <div className="space-y-3 p-4 sm:p-5">
              <Field label="Quantity in stock">
                <input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Stock status">
                <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)} className={selectClass}>
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="pre_order">Pre-order</option>
                </select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-900/70">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="h-4 w-4 rounded border-cream-300 accent-brand-600"
                />
                Track stock for this product
              </label>
              <Field label="Warranty">
                <select value={warranty} onChange={(e) => setWarranty(e.target.value)} className={selectClass}>
                  <option value="company">Company warranty</option>
                  <option value="seller">Seller warranty</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Delivery & tags" />
            <div className="space-y-3 p-4 sm:p-5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-900/70">
                <input
                  type="checkbox"
                  checked={freeDelivery}
                  onChange={(e) => setFreeDelivery(e.target.checked)}
                  className="h-4 w-4 rounded border-cream-300 accent-brand-600"
                />
                Free delivery nationwide
              </label>
              <Field label="Same-day delivery cities" hint="Comma separated">
                <input value={instantCities} onChange={(e) => setInstantCities(e.target.value)} className={inputClass} />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-bold text-ink-900/70">Merchandising tags</p>
                <div className="grid gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <label key={tag.value} className="flex cursor-pointer items-center gap-2 text-xs text-ink-900/70">
                      <input
                        type="checkbox"
                        checked={tags.includes(tag.value)}
                        onChange={(e) =>
                          setTags((current) =>
                            e.target.checked ? [...current, tag.value] : current.filter((t) => t !== tag.value),
                          )
                        }
                        className="h-4 w-4 rounded border-cream-300 accent-brand-600"
                      />
                      {tag.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="SEO" subtitle="Search engine preview" />
            <div className="space-y-3 p-4 sm:p-5">
              <Field label="Meta title">
                <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Meta description">
                <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className={inputClass} />
              </Field>
            </div>
          </Card>

          {isEdit && product && (
            <Card className="border-rose-200">
              <CardHeader title="Danger zone" subtitle="Permanent actions" />
              <div className="p-4 sm:p-5">
                <p className="text-[11px] leading-relaxed text-ink-900/55">
                  Archiving hides the product but keeps order history. Permanent deletion removes the product entirely and
                  is only possible when no order references it.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  <LuTrash2 className="h-3.5 w-3.5" /> Delete permanently
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-200 bg-white/95 backdrop-blur lg:left-[264px]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="hidden min-w-0 truncate text-xs text-ink-900/45 sm:block">
            {isEdit ? `Editing ${product?.name}` : 'New product'} · {plans.length} plan(s) ·{' '}
            {images.length} photo(s)
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="rounded-full border border-cream-300 px-4 py-2 text-xs font-bold text-ink-900 hover:bg-cream-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSave className="h-4 w-4" />}
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this product permanently?"
        message="This cannot be undone. If the product appears in any order, the API will refuse and you should archive it instead."
        confirmLabel="Delete permanently"
        busy={deleting}
        onConfirm={() => void permanentDelete()}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
