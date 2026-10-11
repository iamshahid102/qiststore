'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LuCheck, LuMail, LuMapPin, LuPhone } from 'react-icons/lu';
import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp, FaYoutube } from 'react-icons/fa';

const columns = [
  {
    title: 'About',
    items: [
      { label: 'About Us', href: '/page/about-us' },
      { label: 'FAQs', href: '/page/faqs' },
      { label: 'Visit Us', href: '/visit-us' },
      { label: 'Become a Vendor', href: '/page/become-vendor' },
    ],
  },
  {
    title: 'Information',
    items: [
      { label: 'Verification Process', href: '/page/verification-process' },
      { label: 'Delivery Policy', href: '/page/delivery-policy' },
      { label: 'Payment Methods', href: '/page/payment-method' },
      { label: 'Musawamah Agreement', href: '/page/musawamah-agreement' },
    ],
  },
  {
    title: 'Quick Links',
    items: [
      { label: 'Terms & Conditions', href: '/page/terms-conditions' },
      { label: 'Refund and Returns', href: '/page/refund-return-policy' },
      { label: 'Privacy Policy', href: '/page/privacy-policy' },
      { label: 'Press & Blog', href: '/blogs' },
      { label: 'Order Tracking', href: '/order-tracking' },
    ],
  },
];

const socials = [
  { label: 'Facebook', href: 'https://facebook.com', Icon: FaFacebookF },
  { label: 'Instagram', href: 'https://instagram.com', Icon: FaInstagram },
  { label: 'TikTok', href: 'https://tiktok.com', Icon: FaTiktok },
  { label: 'YouTube', href: 'https://youtube.com', Icon: FaYoutube },
  { label: 'WhatsApp', href: 'https://wa.me/9221111115566', Icon: FaWhatsapp },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="mt-12 bg-ink-900 text-brand-100 sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-3 py-10 sm:px-4 sm:py-14 lg:grid-cols-12">
        {/* Brand + contact */}
        <div className="lg:col-span-4">
          <div className="inline-flex rounded-xl bg-white px-3 py-2">
            <Image src="/brand/logo.png" alt="Qist Store" width={900} height={490} className="h-9 w-auto" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-brand-200">
            Buy now, pay monthly. Electronics and home essentials on easy, transparent installment plans —
            with free nationwide delivery.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-brand-200">
            <li className="flex items-center gap-2.5">
              <LuPhone className="h-4 w-4 shrink-0 text-accent-400" />
              <a href="tel:111115566" className="hover:text-white">111-115-566</a>
            </li>
            <li className="flex items-center gap-2.5">
              <LuMail className="h-4 w-4 shrink-0 text-accent-400" />
              <a href="mailto:support@qiststore.pk" className="hover:text-white">support@qiststore.pk</a>
            </li>
            <li className="flex items-center gap-2.5">
              <LuMapPin className="h-4 w-4 shrink-0 text-accent-400" />
              <Link href="/visit-us" className="hover:text-white">Karachi, Pakistan</Link>
            </li>
          </ul>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.title} className="lg:col-span-2">
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{col.title}</p>
            <ul className="space-y-2.5 text-sm">
              {col.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-brand-200 transition hover:text-accent-400">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Newsletter */}
        <div className="lg:col-span-2">
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Newsletter</p>
          <p className="text-sm text-brand-200">
            Exclusive offers and new arrivals, straight to your inbox.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setSubscribed(true);
            }}
            className="mt-4"
            aria-label="Newsletter signup"
          >
            <div className="flex items-center gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 transition focus-within:ring-accent-400/60">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Email address"
                className="w-full min-w-0 bg-transparent px-3 py-1.5 text-sm text-white outline-none placeholder:text-brand-200/70"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white transition hover:bg-accent-600"
              >
                {subscribed ? <LuCheck className="h-4 w-4" /> : <LuMail className="h-4 w-4" />}
              </button>
            </div>
            {subscribed && (
              <p className="mt-2 text-xs text-accent-400">Thanks — you are on the list.</p>
            )}
          </form>

          <div className="mt-6 flex items-center gap-2.5">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-brand-100 transition hover:bg-accent-500 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-brand-200 sm:flex-row sm:text-left">
          <p>Copyright © {new Date().getFullYear()} Qist Store (demo project). All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/page/terms-conditions" className="hover:text-white">Terms</Link>
            <Link href="/page/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link href="/page/refund-return-policy" className="hover:text-white">Returns</Link>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-brand-100">
              Cash on Delivery
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
