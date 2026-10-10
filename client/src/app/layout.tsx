import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { USPBar } from '@/components/layout/USPBar';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { apiGet } from '@/lib/api';
import type { CategoryNode } from '@/types/api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#185ADB',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Qist Store | Smart Shopping with Easy Installments',
    template: '%s | Qist Store',
  },
  description:
    'Buy smartphones, laptops, home appliances and more on easy monthly installments. Low advance, free delivery, no bank account required.',
  applicationName: 'Qist Store',
  openGraph: {
    type: 'website',
    siteName: 'Qist Store',
    title: 'Qist Store | Smart Shopping with Easy Installments',
    description: 'Electronics and home essentials on easy monthly installments — low advance, free delivery.',
    images: [{ url: '/brand/og-image.jpg', width: 1200, height: 630, alt: 'Qist Store' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qist Store | Smart Shopping with Easy Installments',
    images: ['/brand/og-image.jpg'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cats = await apiGet<CategoryNode[]>('/categories/tree');
  const categories = cats?.data ?? [];

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header categories={categories} />
        <USPBar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
