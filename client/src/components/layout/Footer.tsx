import Image from 'next/image';
import Link from 'next/link';

const columns = [
  {
    title: 'Contact us',
    items: [
      { label: '111-115-566', href: 'tel:111115566' },
      { label: 'support@qiststore.pk', href: 'mailto:support@qiststore.pk' },
      { label: 'Karachi, Pakistan', href: '/visit-us' },
    ],
  },
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

export function Footer() {
  return (
    <footer className="mt-12 bg-brand-900 text-brand-100 sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:py-12 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <div className="inline-flex rounded-xl bg-cream-100 px-3 py-2">
            <Image src="/brand/logo.png" alt="Qist Store" width={900} height={490} className="h-9 w-auto" />
          </div>
          <p className="mt-3 text-sm leading-6 text-brand-200">
            Buy now, pay monthly. Electronics and home essentials on easy, transparent installment plans —
            with free nationwide delivery.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">{col.title}</p>
            <ul className="space-y-2 text-sm">
              {col.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-brand-200 hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-brand-200 sm:flex-row sm:text-left">
          <p>Copyright © {new Date().getFullYear()} Qist Store (demo project). All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span>Facebook</span>
            <span>Instagram</span>
            <span>YouTube</span>
            <span>WhatsApp</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
