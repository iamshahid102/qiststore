/**
 * Vercel serverless entry — the same Express API that runs on localhost:5000.
 *
 * `npm run build -w server` compiles server/ → server/dist, and vercel.json
 * rewrites `/api/v1/*` (and `/health`) into this function, so the storefront
 * and the API share ONE Vercel project:
 *
 *   https://<project>.vercel.app/            → Next.js storefront
 *   https://<project>.vercel.app/api/v1/...  → Express API (this function)
 *   https://<project>.vercel.app/health      → Express health probe
 *
 * The MongoDB connection is created lazily and cached across invocations of
 * the same lambda instance (module scope = warm container), so a cold start
 * pays for the connection once. A DB outage answers 503 DB_UNAVAILABLE
 * through the existing error middleware instead of crashing the function.
 */
import '../scripts/vercel-load-env.mjs'; // must be first: loads server/.env before env.ts parses process.env
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/dist/app.js';
import { connectDb, isDbConnected } from '../server/dist/config/db.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

const app = createApp() as unknown as NodeHandler;

/** Memoised connect so concurrent invocations of a cold instance share one attempt. */
let dbPromise: Promise<unknown> | null = null;
function ensureDb(): Promise<unknown> {
  if (!dbPromise) {
    dbPromise = connectDb().catch((error: unknown) => {
      dbPromise = null; // allow the next invocation to retry
      throw error;
    });
  }
  return dbPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<unknown> {
  if (!isDbConnected()) {
    try {
      await ensureDb();
    } catch {
      // /health + API routes report the degraded state through the error middleware
    }
  }
  return app(req, res);
}

/** Serverless platform hint: allow time for the MongoDB handshake on cold starts. */
export const config = { maxDuration: 30 };
