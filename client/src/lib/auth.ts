'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'qiststore-auth';

export interface StoredAuth {
  accessToken: string;
  user: { id: string; name: string; phone: string; role: string };
}

// ---------------------------------------------------------------------------
// Tiny external store so components read persisted auth through
// useSyncExternalStore instead of copying it into state inside an effect.
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot is the raw string so repeated calls compare equal (stable). */
export function getAuthSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}

export function getAuthServerSnapshot(): string | null {
  return null;
}

/** Re-renders when auth is saved or cleared. Hydration-safe. */
export function useAuthRaw(): string | null {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);
}

export function parseAuth(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(auth));
  emit();
}

export function loadAuth(): StoredAuth | null {
  return parseAuth(getAuthSnapshot());
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  emit();
}
