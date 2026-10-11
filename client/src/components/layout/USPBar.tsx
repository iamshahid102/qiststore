import { LuBadgeCheck, LuLandmark, LuShieldCheck, LuTruck } from 'react-icons/lu';

const usps = [
  { icon: LuTruck, title: 'Free Delivery', subtitle: 'On all orders nationwide' },
  { icon: LuBadgeCheck, title: 'Easy Verification', subtitle: 'Quick and hassle-free setup' },
  { icon: LuLandmark, title: 'No Bank Account', subtitle: 'Simple payment options' },
  { icon: LuShieldCheck, title: 'No Hidden Charges', subtitle: 'Zero documentation fees' },
] as const;

/** Compact trust strip shown directly above the footer on every route. */
export function USPBar() {
  return (
    <section className="mt-10 border-t border-cream-200 bg-cream-50 sm:mt-14" aria-label="Why shop with us">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-3 py-4 sm:px-4 sm:py-5 lg:grid-cols-4">
        {usps.map(({ icon: Icon, title, subtitle }) => (
          <div
            key={title}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-3 sm:px-4"
          >
            <span className="qb-icon-chip h-10 w-10 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink-900 sm:text-sm">{title}</p>
              <p className="hidden truncate text-xs text-gray-500 sm:block">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
