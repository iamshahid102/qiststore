/**
 * Dev/local convenience loader for the Vercel serverless API entry.
 *
 * MUST be imported (statically) before any `server/dist/*` module: env.ts
 * parses process.env at import time, so server/.env has to be loaded first.
 *
 * On Vercel this file does nothing useful — the .env file is not present and
 * the platform-injected environment (MONGO_URI, JWT secrets, Cloudinary, …)
 * is used as-is. It lives OUTSIDE /api on purpose: every file inside /api is
 * deployed as a serverless function.
 */
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv({
  path: fileURLToPath(new URL('../server/.env', import.meta.url)),
  quiet: true,
});
