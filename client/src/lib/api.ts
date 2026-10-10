import type { PaginationMeta } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

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
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
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
