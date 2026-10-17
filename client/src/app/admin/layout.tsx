'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LuArrowUpRight,
  LuClipboardList,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuPackage,
  LuShieldCheck,
  LuStore,
  LuUsers,
  LuX,
} from 'react-icons/lu';
import { clearAuth, parseAuth, useAuthRaw } from '@/lib/auth';
import { adminGet } from '@/lib/admin-api';
import { cn } from '@/components/admin/ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: <LuLayoutDashboard className="h-[18px] w-[18px]" />, exact: true }],
  },
  {
    section: 'Catalogue',
    items: [{ href: '/admin/products', label: 'Products', icon: <LuPackage className="h-[18px] w-[18px]" /> }],
  },
  {
    section: 'Sales',
    items: [{ href: '/admin/orders', label: 'Orders', icon: <LuClipboardList className="h-[18px] w-[18px]" /> }],
  },
  {
    section: 'People',
    items: [{ href: '/admin/customers', label: 'Customers', icon: <LuUsers className="h-[18px] w-[18px]" /> }],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function pageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Dashboard';
  if (pathname.startsWith('/admin/products/new')) return 'Add product';
  if (pathname.startsWith('/admin/products/')) return 'Edit product';
  if (pathname.startsWith('/admin/products')) return 'Products';
  if (pathname.startsWith('/admin/orders/')) return 'Order detail';
  if (pathname.startsWith('/admin/orders')) return 'Orders';
  if (pathname.startsWith('/admin/customers/')) return 'Customer profile';
  if (pathname.startsWith('/admin/customers')) return 'Customers';
  return 'Admin';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const raw = useAuthRaw();
  const auth = useMemo(() => parseAuth(raw), [raw]);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const isStaff = auth?.user.role === 'admin' || auth?.user.role === 'staff';

  // Avoid rendering the wrong gate during hydration (auth lives in localStorage).
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Confirm the token with the API (a stale/forged role in localStorage is not trusted).
  useEffect(() => {
    if (!auth || !isStaff) return;
    let cancelled = false;
    adminGet<{ role: string }>('/me')
      .then((res) => {
        if (!cancelled) setVerifiedRole(res.data.role);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      });
    return () => {
      cancelled = true;
    };
  }, [auth, isStaff]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-900 text-sm font-semibold text-white/60">
        Loading admin…
      </div>
    );
  }

  if (!auth) {
    return (
      <Gate
        title="Admin sign in required"
        message="This area is restricted to Qist Store staff. Log in with an administrator account to continue."
        primary={{ href: `/account/login?next=${encodeURIComponent(pathname || '/admin')}`, label: 'Log in' }}
        secondary={{ href: '/', label: 'Back to store' }}
      />
    );
  }

  if (!isStaff || denied) {
    return (
      <Gate
        title="Access denied"
        message="Your account is signed in, but it does not have admin or staff permissions. Contact the store owner if you believe this is a mistake."
        primary={{ href: '/', label: 'Back to store' }}
        secondary={{ href: '/account', label: 'My account' }}
      />
    );
  }

  const roleLabel = (verifiedRole ?? auth.user.role) === 'admin' ? 'Administrator' : 'Staff';

  async function logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    clearAuth();
    router.push('/account/login');
  }

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-800/50 bg-ink-900 px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"
          aria-label="Open admin menu"
        >
          <LuMenu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold">Qist Admin</span>
        <span className="ml-auto truncate text-right text-xs text-white/70">{pageTitle(pathname)}</span>
      </div>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink-900 text-white transition-transform duration-200 lg:translate-x-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <Image src="/brand/logo.png" alt="Qist Store" width={900} height={490} className="h-8 w-auto rounded bg-white/95 px-1.5 py-1" />
          </Link>
          <span className="ml-auto rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
            Admin
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
            aria-label="Close admin menu"
          >
            <LuX className="h-4 w-4" />
          </button>
        </div>

        <nav className="qb-scroll-x flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                        active
                          ? 'bg-brand-600 text-white shadow-[0_8px_20px_-12px_rgba(24,90,219,0.9)]'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <span className={cn(active ? 'text-white' : 'text-white/50 group-hover:text-white')}>{item.icon}</span>
                      {item.label}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-500" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
              <LuShieldCheck className="h-3.5 w-3.5 text-accent-400" /> Secure area
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">
              Every action here is authorised against your role and written to the order timeline.
            </p>
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold">
              {auth.user.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{auth.user.name}</p>
              <p className="truncate text-[10px] text-white/45">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Log out"
              title="Log out"
            >
              <LuLogOut className="h-4 w-4" />
            </button>
          </div>

          <Link
            href="/"
            target="_blank"
            className="mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <LuStore className="h-4 w-4" /> View storefront
            </span>
            <LuArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 hidden border-b border-cream-200 bg-white/90 backdrop-blur lg:block">
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-900/45">
              <span className="font-semibold text-ink-900/60">Admin</span>
              <span>/</span>
              <span className="font-bold text-ink-900">{pageTitle(pathname)}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 xl:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data
              </span>
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-accent-600"
              >
                + New product
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Gate({
  title,
  message,
  primary,
  secondary,
}: {
  title: string;
  message: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl sm:p-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <LuShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-900/55">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={primary.href}
            className="inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            {primary.label}
          </Link>
          <Link
            href={secondary.href}
            className="inline-flex items-center justify-center rounded-full border border-cream-300 px-5 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-cream-50"
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
