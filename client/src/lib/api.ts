import type { PaginationMeta } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

/**
 * Where should SERVER-side fetches (SSR) hit the API?
 *  1. `NEXT_PUBLIC_API_URL` when explicitly configured (e.g. a dedicated API host)
 *  2. otherwise the SAME origin the request arrived on — on Vercel the API is
 *     the `api` service of this very project (see /vercel.json), and locally
 *     the Next rewrite proxies /api/v1 to Express on :5000
 *  3. localhost fallback for build-time / non-request contexts
 */
async function resolveServerApiBase(): Promise<string> {
  if (process.env.NEXT_PUBLIC_API_URL) return API_URL;
  try {
    const { headers } = await import('next/headers');
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
    if (host) {
      const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
      return `${protocol}://${host}/api/v1`;
    }
  } catch {
    /* not inside a request scope (build/scripts) — fall back to the default */
  }
  return API_URL;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Server-side fetch. Returns null on any failure so pages degrade to
 * empty states instead of crashing (dev machines may not have the API up).
 */
export async function apiGet<T>(path: string): Promise<{ data: T; meta?: PaginationMeta } | null> {
  const base = await resolveServerApiBase();
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<T>;
    return { data: json.data, meta: json.meta };
  } catch {
    return null;
  }
}

/**
 * Client-side fetch through the Next.js rewrite proxy (/api/v1 -> Express).
 * Throws on non-2xx with the server's error message.
 */
export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json.data as T;
}

/**
 * Multipart upload (admin image uploads → Cloudinary via the API proxy).
 * The API stores the file and returns its CDN URL.
 */
export async function apiUpload<T>(path: string, file: File, token: string, field = 'file'): Promise<T> {
  const form = new FormData();
  form.append(field, file);

  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message ?? `Upload failed (${res.status})`;
    throw new Error(message);
  }
  return json.data as T;
}

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export async function apiGetClient<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json.data as T;
}
