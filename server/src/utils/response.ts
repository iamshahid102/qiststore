import type { Response } from 'express';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(res: Response, data: T, meta?: object, status = 200): Response {
  const body: ApiEnvelope<T> = { success: true, data, ...(meta ? { meta: meta as Record<string, unknown> } : {}) };
  return res.status(status).json(body);
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}
