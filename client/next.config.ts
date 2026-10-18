import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Product/catalogue imagery lives on Cloudinary's CDN, so image sizing is
    // delegated to Cloudinary's own transformation API instead of Vercel's
    // optimizer — `/_next/image` is not served for a Next.js service in
    // services mode (it 404s), which broke every optimized image in production.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  async rewrites() {
    // On Vercel the API is the `api` service of this same project (see
    // /vercel.json), so /api/v1/* is already routed there before it reaches
    // Next. Proxying to a localhost API there would fail — skip it.
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
