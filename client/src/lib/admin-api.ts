'use client';

import { clearAuth, loadAuth, saveAuth } from '@/lib/auth';
import type { PaginationMeta } from '@/types/api';

/**
 * Admin API client.
 *
 * - Adds the bearer token from localStorage.
 * - Retries once through /auth/refresh when the 15-minute access token expires,
 *   so a dashboard left open does not silently die.
 * - Surfaces the server's error message (the API always answers with
 *   { success:false, error:{ code, message } }).
 */
export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'ERROR',
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { accessToken?: string } };
    const token = json.data?.accessToken;
    const stored = loadAuth();
    if (!token || !stored) return null;
    saveAuth({ ...stored, accessToken: token });
    return token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<Envelope<T>> {
  const stored = loadAuth();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (stored?.accessToken) headers.set('Authorization', `Bearer ${stored.accessToken}`);

  const res = await fetch(`/api/v1/admin${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  if (res.status === 401 && allowRefresh) {
    const token = await refreshAccessToken();
    if (token) {
      return request<T>(path, init, false);
    }
    clearAuth();
    if (typeof window !== 'undefined') {
      const next = window.location.pathname;
      window.location.assign(`/account/login?next=${encodeURIComponent(next)}`);
    }
    throw new AdminApiError('Your session expired. Please log in again.', 401, 'UNAUTHORIZED');
  }

  const json = (await res.json().catch(() => null)) as
    | (Envelope<T> & { error?: { code?: string; message?: string } })
    | null;

  if (!res.ok || !json?.success) {
    throw new AdminApiError(
      json?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      json?.error?.code ?? 'ERROR',
    );
  }
  return json;
}

export function adminGet<T>(path: string): Promise<Envelope<T>> {
  return request<T>(path);
}

export function adminPost<T>(path: string, body: unknown): Promise<Envelope<T>> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function adminPatch<T>(path: string, body: unknown = {}): Promise<Envelope<T>> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function adminDelete<T>(path: string): Promise<Envelope<T>> {
  return request<T>(path, { method: 'DELETE' });
}

/** Bearer header from the current session, refreshed once when expired. */
function authorization(): Record<string, string> {
  const stored = loadAuth();
  if (!stored?.accessToken) return {};
  return { Authorization: `Bearer ${stored.accessToken}` };
}

/** Multipart upload to Cloudinary through the admin upload endpoint. */
export async function adminUpload(file: File): Promise<{ url: string; publicId: string }> {
  const form = new FormData();
  form.append('file', file);

  const send = (headers: Record<string, string>) =>
    fetch('/api/v1/admin/uploads', { method: 'POST', headers, body: form, credentials: 'include' });

  let res = await send(authorization());
  if (res.status === 401) {
    const token = await refreshAccessToken();
    if (token) res = await send({ Authorization: `Bearer ${token}` });
  }

  const json = (await res.json().catch(() => null)) as
    | { data?: { url: string; publicId: string }; error?: { message?: string } }
    | null;
  if (!res.ok || !json?.data) {
    throw new AdminApiError(json?.error?.message ?? `Upload failed (${res.status})`, res.status);
  }
  return json.data;
}

/** Download a CSV through the authenticated API and trigger a browser save. */
export async function adminDownloadCsv(path: string, filename: string): Promise<void> {
  const send = (headers: Record<string, string>) =>
    fetch(`/api/v1/admin${path}`, { headers, credentials: 'include' });

  let res = await send(authorization());
  if (res.status === 401) {
    const token = await refreshAccessToken();
    if (token) res = await send({ Authorization: `Bearer ${token}` });
  }
  if (!res.ok) throw new AdminApiError(`Export failed (${res.status})`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
