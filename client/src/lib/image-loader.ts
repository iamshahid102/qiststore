/**
 * Custom `next/image` loader (wired in `next.config.ts`).
 *
 * Vercel's image optimizer is not available to a Next.js service in services
 * mode: `/_next/image?url=...` is answered by the 404 page, so every optimized
 * image 404s in production while working locally. Instead of shipping raw
 * full-size files (`unoptimized: true`), let Cloudinary do the resizing — the
 * catalogue already lives there:
 *
 *   .../image/upload/v123/qiststore/products/x.jpg
 *   → .../image/upload/f_auto,q_70,w_640,c_limit/v123/qiststore/products/x.jpg
 *
 * Anything that is not a Cloudinary image (brand assets in `client/public`,
 * admin-pasted URLs from other hosts) is returned untouched, so those request
 * the file/CDN URL directly.
 */
export interface ImageLoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

const CLOUDINARY_UPLOAD_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+)\/image\/upload\/(.+)$/i;
/** An existing transform segment, e.g. `f_auto,q_auto,w_640,c_limit`. */
const TRANSFORM_SEGMENT_RE = /^(?:[a-z]+_[^/,]+,)*[a-z]+_[^/,]+$/i;

export default function cloudinaryImageLoader({ src, width, quality }: ImageLoaderArgs): string {
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  const match = src.match(CLOUDINARY_UPLOAD_RE);
  const base = match?.[1];
  const rest = match?.[2];
  if (!base || !rest) return src;
  const [head, ...tail] = rest.split('/');
  // Drop an existing transform segment ("f_auto,q_auto,w_640,c_limit") so
  // transforms never stack up when a URL is loaded twice through the loader.
  const path = tail.length > 0 && head && TRANSFORM_SEGMENT_RE.test(head) ? tail.join('/') : rest;

  const transform = ['f_auto', `q_${quality ?? 70}`, `w_${width}`, 'c_limit'].join(',');
  return `${base}/image/upload/${transform}/${path}`;
}
