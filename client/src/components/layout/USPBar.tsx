const usps = [
  { icon: '🚚', title: 'Free Delivery', subtitle: 'On all orders nationwide' },
  { icon: '✅', title: 'Easy Verification', subtitle: 'Quick and hassle-free setup' },
  { icon: '🏦', title: 'No Bank Account', subtitle: 'Simple payment options' },
  { icon: '🔒', title: 'No Hidden Charges', subtitle: 'Zero documentation fees' },
];

export function USPBar() {
  return (
    <section className="bg-cream-50" aria-label="Why shop with us">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4 lg:grid-cols-4">
        {usps.map((u) => (
          <div key={u.title} className="flex min-w-0 items-center gap-2 rounded-lg border border-cream-200 bg-white px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
            <span className="text-lg sm:text-2xl" aria-hidden>{u.icon}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900 sm:text-sm">{u.title}</p>
              <p className="hidden truncate text-xs text-gray-500 sm:block">{u.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
