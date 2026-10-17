import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Product/catalogue imagery is delivered from Cloudinary's CDN.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    // On Vercel the API ships inside the SAME project as a serverless function
    // (see /vercel.json), which rewrites /api/v1/* itself. Proxying to a
    // localhost API there would fail, so this local/dev proxy is skipped.
    if (process.env.VERCEL && !process.env.API_PROXY_URL) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_PROXY_URL ?? 'http://localhost:5000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
