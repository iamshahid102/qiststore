import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.issues },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');

  // If the unhandled failure happened while the database was down, report it
  // as a service-unavailability rather than a generic 500 (dev degraded mode).
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database is not connected. Start MongoDB and retry.',
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : String((err as Error)?.message ?? err),
    },
  });
}
