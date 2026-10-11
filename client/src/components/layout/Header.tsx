'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuHeart, LuMenu, LuPhone, LuSearch, LuShoppingCart, LuStore, LuTruck, LuUser, LuX } from 'react-icons/lu';
import { useCart } from '@/stores/cart';
import { useWishlist } from '@/stores/wishlist';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { CategoryNode } from '@/types/api';

/** Main navigation links — the same set on desktop and in the mobile drawer. */
const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Deals', href: '/shop?sort=discount' },
  { label: 'Stores', href: '/stores' },
  { label: 'Visit Us', href: '/visit-us' },
];

export function Header({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const items = useCart((s) => s.items);
  const wishlistCount = useWishlist((s) => s.items.length);
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
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_1px_0_rgba(11,27,57,0.06),0_10px_30px_-24px_rgba(11,27,57,0.5)] backdrop-blur">
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-1.5 text-[11px] sm:px-4 sm:text-xs">
          <p className="flex min-w-0 items-center gap-2 truncate font-medium">
            <LuTruck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">
              Free delivery nationwide · Easy verification · No bank account required
            </span>
            <span className="sm:hidden">Free delivery · No bank account needed</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="tel:111115566"
              className="hidden items-center gap-1.5 font-medium hover:text-accent-200 sm:inline-flex"
            >
              <LuPhone className="h-3.5 w-3.5" /> 111-115-566
            </a>
            <Link href="/account/login" className="font-medium hover:text-accent-200">
              Log in
            </Link>
            <Link href="/account/register" className="hidden font-medium hover:text-accent-200 sm:inline">
              Register
            </Link>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4 sm:gap-5">
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

        {/* Primary nav (desktop) */}
        <nav className="hidden items-center gap-5 text-sm font-semibold text-ink-900 xl:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Search pill (desktop) */}
        <form onSubmit={onSearch} className="hidden flex-1 md:block">
          <div className="flex items-center gap-2 rounded-full border border-cream-300 bg-cream-50 pl-4 pr-1.5 py-1.5 transition focus-within:border-brand-400 focus-within:bg-white">
            <LuSearch className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mobiles, laptops, ACs…"
              aria-label="Search products"
              className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="qb-btn-dark shrink-0 px-4 py-1.5 text-xs sm:px-5"
            >
              Search
            </button>
          </div>
        </form>

        {/* Utility icons */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/account"
            aria-label="My account"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-900 transition hover:bg-brand-50 hover:text-brand-600 sm:inline-flex"
          >
            <LuUser className="h-5 w-5" />
          </Link>
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} items`}
            className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ink-900 transition hover:bg-brand-50 hover:text-brand-600 sm:inline-flex"
          >
            <LuHeart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <Badge>{wishlistCount}</Badge>
            )}
          </Link>
          <Link
            href="/cart"
            aria-label={`Cart, ${cartCount} items`}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-900 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <LuShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <Badge>{cartCount}</Badge>}
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-900 transition hover:bg-brand-50 md:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <LuX className="h-5 w-5" /> : <LuMenu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search + drawer */}
      <div data-testid="mobile-search" className="border-t border-cream-200 md:hidden">
        <form onSubmit={onSearch} className="px-3 pt-3">
          <div className="flex items-center gap-2 rounded-full border border-cream-300 bg-cream-50 pl-4 pr-1.5 py-1.5">
            <LuSearch className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-gray-400"
            />
            <button type="submit" className="qb-btn-dark shrink-0 px-4 py-1.5 text-xs">
              Go
            </button>
          </div>
        </form>
        {menuOpen && (
          <div className="px-3 pb-4 pt-3">
            <nav className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/product-category/${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-w-0 items-center gap-2 truncate rounded-xl px-2 py-2 text-sm font-medium text-ink-900 hover:bg-brand-50 hover:text-brand-700"
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-brand-500" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-ink-900 hover:bg-brand-50"
              >
                <LuHeart className="h-4 w-4 text-brand-500" /> Wishlist
              </Link>
              <Link
                href="/stores"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-ink-900 hover:bg-brand-50"
              >
                <LuStore className="h-4 w-4 text-brand-500" /> Partner Stores
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Category nav (desktop) */}
      <nav data-testid="category-nav-desktop" className="hidden border-t border-cream-200 md:block">
        <div className="qb-scroll-x mx-auto flex max-w-7xl items-center gap-5 px-4 py-2.5 text-sm">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/product-category/${c.slug}`}
              className="whitespace-nowrap font-medium text-ink-900/80 transition hover:text-brand-600"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
      {children}
    </span>
  );
}


