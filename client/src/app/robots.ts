import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account/', '/order-tracking', '/search', '/cart', '/checkout'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
