import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { USPBar } from '@/components/layout/USPBar';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { apiGet } from '@/lib/api';
import type { CategoryNode } from '@/types/api';

/**
 * Storefront shell — header, trust bar, footer and WhatsApp bubble.
 * The admin dashboard lives outside this route group and renders its own shell.
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const cats = await apiGet<CategoryNode[]>('/categories/tree');
  const categories = cats?.data ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <USPBar />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
