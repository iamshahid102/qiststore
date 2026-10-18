/**
 * Entrypoint for the Vercel "api" service (see /vercel.json → services.api).
 *
 * Two things are deliberate here:
 *
 * 1. `.mjs`, not `.ts` — Vercel's Express preset emits a `.ts`/`.js` entrypoint
 *    as `app.js` while keeping ESM syntax, so the function runtime loads it as
 *    CommonJS and dies with "Cannot use import statement outside a module".
 *    A `.mjs` entrypoint is always emitted (and loaded) as ESM.
 * 2. The `express` import — the preset only auto-detects an entrypoint that
 *    references the framework, and `src/app.ts` would otherwise win and be
 *    bundled without ever calling `listen()`.
 *
 * The actual server is `src/index.ts` (built with tsc → `dist/`): it connects to
 * MongoDB, builds the Express app and listens on $PORT — a long-lived HTTP server,
 * which is what a Vercel service expects.
 */
import express from 'express';
import './dist/index.js';

// Startup sanity check: the service and the app must share one express instance,
// otherwise routers/middleware silently misbehave. Doubles as the framework
// reference the Vercel Express preset looks for.
if (typeof express.Router !== 'function') {
  throw new Error('express failed to load in the Vercel service runtime');
}
