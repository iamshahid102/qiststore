import type { Metadata } from 'next';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import type { BlogPost } from '@/types/api';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Press & Blog',
  description: 'News, guides and updates from Qist Store.',
};

export default async function BlogsPage() {
  const posts = await apiGet<BlogPost[]>('/blogs');
  const items = posts?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">Press &amp; Blog</h1>
      <p className="mt-1 text-gray-600">Guides, product news and company updates.</p>
      <div className="mt-6 space-y-4">
        {items.map((post) => (
          <article key={post.slug} className="rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="rounded bg-brand-50 px-2 py-0.5 font-semibold uppercase text-brand-700">{post.type}</span>
              {formatDate(post.publishedAt)}
            </div>
            <h2 className="mt-2 text-lg font-bold text-gray-900">
              <Link href={`/blogs/${post.slug}`} className="hover:text-brand-600">{post.title}</Link>
            </h2>
            <p className="mt-1 text-sm text-gray-600">{post.excerpt}</p>
            <Link href={`/blogs/${post.slug}`} className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
              Read more →
            </Link>
          </article>
        ))}
        {items.length === 0 && <p className="text-gray-500">No posts yet.</p>}
      </div>
    </div>
  );
}
