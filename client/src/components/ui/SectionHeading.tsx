import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';

/**
 * Section heading in the reference style: accent eyebrow label above a bold
 * display title, with an optional right-aligned "View all" action.
 */
export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = 'View all',
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
      <div className="min-w-0">
        <p className="qb-eyebrow">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl lg:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream-300 bg-white px-4 py-2 text-xs font-bold text-ink-900 transition hover:border-brand-300 hover:text-brand-700 sm:text-sm"
        >
          {linkLabel}
          <LuArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
