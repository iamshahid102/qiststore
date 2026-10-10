import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api';
import type { CategoryNode, ProductSummary, BlogPost } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/shop',
    '/stores',
    '/visit-us',
    '/blogs',
    '/order-tracking',
    '/page/about-us',
    '/page/faqs',
    '/page/contact-us',
    '/page/verification-process',
    '/page/payment-method',
    '/page/delivery-policy',
    '/page/refund-return-policy',
    '/page/terms-conditions',
    '/page/privacy-policy',
    '/page/musawamah-agreement',
    '/page/become-vendor',
  ].map((path) => ({ url: `${BASE_URL}${path}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 }));

  const [cats, products, blogs] = await Promise.all([
    apiGet<CategoryNode[]>('/categories/tree'),
    apiGet<ProductSummary[]>('/products?limit=50'),
    apiGet<BlogPost[]>('/blogs?limit=50'),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = [];
  for (const c of cats?.data ?? []) {
    categoryRoutes.push({ url: `${BASE_URL}/product-category/${c.slug}`, changeFrequency: 'weekly', priority: 0.9 });
    for (const child of c.children) {
      categoryRoutes.push({
        url: `${BASE_URL}/product-category/${c.slug}/${child.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  const productRoutes: MetadataRoute.Sitemap = (products?.data ?? []).map((p) => ({
    url: `${BASE_URL}/product/${p.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = (blogs?.data ?? []).map((b) => ({
    url: `${BASE_URL}/blogs/${b.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
