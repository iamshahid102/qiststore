'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminGet } from '@/lib/admin-api';
import { ProductForm } from '@/components/admin/ProductForm';
import { Banner, Spinner } from '@/components/admin/ui';
import type { AdminProduct } from '@/types/admin';

export default function EditProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    adminGet<AdminProduct>(`/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!cancelled) setProduct(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load product');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <Spinner label="Loading product…" />;

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Banner tone="error">{error || 'Product not found'}</Banner>
        <Link
          href="/admin/products"
          className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return <ProductForm product={product} />;
}
