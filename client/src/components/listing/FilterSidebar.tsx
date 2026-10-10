'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { CategoryNode } from '@/types/api';

interface BrandOption {
  name: string;
  slug: string;
}

/**
 * Listing filter sidebar. Filter state lives in the URL (shareable, SEO-safe)
 * and is rebuilt server-side on each request.
 */
export function FilterSidebar({
  categories,
  brands,
  title = 'Filters',
}: {
  categories: CategoryNode[];
  brands?: BrandOption[];
  title?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') ?? '');

  function applyParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page'); // reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['category', 'brand', 'minPrice', 'maxPrice', 'page']) params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function onPriceSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('minPrice', minPrice); else params.delete('minPrice');
    if (maxPrice) params.set('maxPrice', maxPrice); else params.delete('maxPrice');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeCategory = searchParams.get('category');
  const activeBrand = searchParams.get('brand');
  const sort = searchParams.get('sort') ?? 'popular';

  return (
    <aside className="w-full shrink-0 space-y-5 rounded-xl border border-cream-200 bg-white p-3 sm:space-y-6 sm:p-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:w-64 lg:overflow-y-auto">
      <div>
        <h3 className="mb-3 font-bold text-gray-900">{title}</h3>

        {/* Sort */}
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="sort-select">
          Sort by
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => applyParam('sort', e.target.value)}
          className="mb-5 w-full rounded border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="popular">Popularity</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Advance: Low to High</option>
          <option value="price-desc">Advance: High to Low</option>
        </select>
      </div>

      {/* Price range */}
      <form onSubmit={onPriceSubmit}>
        <p className="mb-2 text-sm font-semibold text-gray-800">By Price</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            aria-label="Minimum advance price"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            aria-label="Maximum advance price"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="submit" className="flex-1 rounded bg-brand-600 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-800">Categories</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <button
                  onClick={() => applyParam('category', activeCategory === c.slug ? null : c.slug)}
                  className={`w-full text-left hover:text-brand-600 ${
                    activeCategory === c.slug ? 'font-bold text-brand-700' : 'text-gray-600'
                  }`}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Brands */}
      {brands && brands.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-800">Brands</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {brands.map((b) => (
              <li key={b.slug}>
                <button
                  onClick={() => applyParam('brand', activeBrand === b.slug ? null : b.slug)}
                  className={`w-full text-left hover:text-brand-600 ${
                    activeBrand === b.slug ? 'font-bold text-brand-700' : 'text-gray-600'
                  }`}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
