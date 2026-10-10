import Link from 'next/link';
import type { PaginationMeta } from '@/types/api';

/**
 * Server-rendered Prev/Next pagination. The current query string is passed in
 * from the page component so filters are preserved across pages.
 */
export function Pagination({ meta, query }: { meta: PaginationMeta; query: Record<string, string> }) {
  if (meta.pages <= 1) return null;

  function href(page: number) {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    return `?${params.toString()}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      {meta.page > 1 ? (
        <Link href={href(meta.page - 1)} className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          ← Previous
        </Link>
      ) : (
        <span className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-300">← Previous</span>
      )}
      <span className="text-sm text-gray-600">
        Page {meta.page} of {meta.pages} · {meta.total} products
      </span>
      {meta.page < meta.pages ? (
        <Link href={href(meta.page + 1)} className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          Next →
        </Link>
      ) : (
        <span className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-300">Next →</span>
      )}
    </nav>
  );
}
