import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { isDbConnected, waitForDb } from './config/db.js';
import { globalLimiter } from './middlewares/rateLimit.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(globalLimiter);

  // Serverless cold start: the platform can start serving before the MongoDB
  // handshake finishes. Give that first attempt a short window so the first
  // few requests do not fail with 503 DB_UNAVAILABLE.
  app.use(async (_req, _res, next) => {
    await waitForDb();
    next();
  });

  app.get('/health', async (_req, res) => {
    // A health probe may afford a slightly longer wait than a normal request:
    // report the settled state instead of a momentary "reconnecting" blip.
    const connected = isDbConnected() || (await waitForDb(3000));
    res.json({
      success: true,
      data: {
        status: connected ? 'ok' : 'degraded',
        db: connected ? 'connected' : 'disconnected',
        uptime: process.uptime(),
      },
    });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
