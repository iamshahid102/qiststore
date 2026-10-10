import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const RETRY_MS = 10_000;

/**
 * Production: fail fast — a marketplace must not serve traffic without its database.
 * Development: start anyway and keep retrying, so the storefront/API can be
 * explored before MongoDB is installed. /health reports the real DB state and
 * DB-backed routes answer 503 DB_UNAVAILABLE instead of crashing.
 */
async function bootstrapDb(): Promise<void> {
  try {
    await connectDb();
  } catch (err) {
    if (env.NODE_ENV === 'production') {
      logger.error({ err }, 'Failed to connect to MongoDB — refusing to start in production');
      process.exit(1);
    }
    logger.warn(
      { err: (err as Error).message },
      `MongoDB unavailable. Starting in DEGRADED mode (dev only); retrying every ${RETRY_MS / 1000}s. ` +
        'Install MongoDB or set MONGO_URI, then run: npm run seed -w server',
    );
    const retry = setInterval(async () => {
      try {
        await connectDb();
        clearInterval(retry);
        logger.info('MongoDB connected — full functionality restored');
      } catch {
        /* keep retrying quietly */
      }
    }, RETRY_MS);
  }
}

async function main() {
  await bootstrapDb();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Qist Store API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal bootstrap error');
  process.exit(1);
});
