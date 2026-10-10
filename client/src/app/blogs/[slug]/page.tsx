import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { BlogPost } from '@/types/api';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await apiGet<BlogPost>(`/blogs/${slug}`);
  if (!post) return { title: 'Post' };
  return { title: post.data.title, description: post.data.excerpt };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await apiGet<BlogPost>(`/blogs/${slug}`);
  if (!post) notFound();
  const p = post.data;

  return (
    <article className="mx-auto max-w-3xl px-3 sm:px-4 py-10">
      <Link href="/blogs" className="text-sm text-brand-600 hover:underline">← All posts</Link>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">{p.title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {formatDate(p.publishedAt)} · {p.author}
        {p.tags.length > 0 && <> · {p.tags.join(', ')}</>}
      </p>
      <div className="mt-6 whitespace-pre-line leading-8 text-gray-800">{p.body}</div>
    </article>
  );
}
