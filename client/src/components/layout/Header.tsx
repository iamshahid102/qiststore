'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/stores/cart';
import type { CategoryNode } from '@/types/api';

export function Header({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCart((s) => s.items);
  const cartCount = items.reduce((n, i) => n + i.qty, 0);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top utility bar */}
      <div className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 text-[11px] sm:px-4 sm:text-xs">
          <p className="min-w-0 truncate">
            <span className="sm:hidden">Free delivery · No bank account needed</span>
            <span className="hidden sm:inline">
              Free delivery nationwide · Easy verification · No bank account required
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <a href="tel:111115566" className="hidden font-medium sm:inline">📞 111-115-566</a>
            <Link href="/account/login" className="hover:underline">Log in</Link>
            <Link href="/account/register" className="hidden hover:underline sm:inline">Register</Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Qist Store home">
          <Image
            src="/brand/logo.png"
            alt="Qist Store"
            width={900}
            height={490}
            priority
            className="h-8 w-auto sm:h-10 lg:h-11"
          />
        </Link>

        <form onSubmit={onSearch} className="hidden flex-1 md:block">
          <div className="flex overflow-hidden rounded-full border border-cream-300 bg-cream-50 focus-within:border-brand-500">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mobiles, laptops, ACs…"
              aria-label="Search products"
              className="w-full bg-transparent px-4 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Search
            </button>
          </div>
        </form>

        <nav className="ml-auto flex shrink-0 items-center gap-3 text-sm font-medium sm:gap-4">
          <Link href="/wishlist" className="hidden hover:text-brand-600 sm:inline">Wishlist</Link>
          <Link href="/cart" className="relative flex items-center gap-1 hover:text-brand-600" aria-label={`Cart, ${cartCount} items`}>
            <span aria-hidden>🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="rounded border border-cream-300 px-2 py-1 md:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </nav>
      </div>

      {/* Mobile search + menu */}
      <div className="border-t border-cream-200 md:hidden">
        <form onSubmit={onSearch} className="px-3 pt-3">
          <div className="flex overflow-hidden rounded-full border border-cream-300 bg-cream-50">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full bg-transparent px-4 py-2 text-sm outline-none"
            />
            <button type="submit" className="bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Go</button>
          </div>
        </form>
        {menuOpen && (
          <div className="grid grid-cols-2 gap-1 px-3 pb-3 pt-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/product-category/${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="truncate py-1.5 text-sm text-gray-700"
              >
                {c.icon} {c.name}
              </Link>
            ))}
            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="py-1.5 text-sm text-gray-700">
              ♡ Wishlist
            </Link>
            <Link href="/stores" onClick={() => setMenuOpen(false)} className="py-1.5 text-sm text-gray-700">
              🏬 Partner Stores
            </Link>
          </div>
        )}
      </div>

      {/* Category nav (desktop) */}
      <nav className="hidden border-t border-cream-200 md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-2 text-sm">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/product-category/${c.slug}`}
              className="whitespace-nowrap text-gray-700 hover:text-brand-600"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
