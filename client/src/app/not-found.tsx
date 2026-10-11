import Link from 'next/link';
import { LuCompass } from 'react-icons/lu';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-3 sm:px-4 py-24 text-center">
      <span className="qb-icon-chip mx-auto h-20 w-20">
        <LuCompass className="h-9 w-9" aria-hidden />
      </span>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700">
        Back to Home
      </Link>
    </div>
  );
}
