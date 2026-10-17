import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import type { CmsPage } from '@/types/api';
import { BlockRenderer } from '@/components/cms/BlockRenderer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await apiGet<CmsPage>(`/pages/${slug}`);
  if (!page) return { title: 'Page' };
  return {
    title: page.data.seo?.title || page.data.title,
    description: page.data.seo?.description || page.data.subtitle,
  };
}

export default async function CmsPageRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = await apiGet<CmsPage>(`/pages/${slug}`);
  if (!page) notFound();
  const p = page.data;

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{p.title}</h1>
      {p.subtitle && <p className="mt-2 text-gray-600">{p.subtitle}</p>}
      <div className="mt-8">
        <BlockRenderer blocks={p.blocks} />
      </div>
    </div>
  );
}
