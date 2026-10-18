/**
 * Writes `dist/package.json` right after `tsc` so the compiled output is
 * unambiguously ESM.
 *
 * Why: on Vercel the API runs as a lambda whose files are the contents of
 * `dist/` (one of the directories Vercel's Express preset looks for a built
 * entrypoint). That lambda root has no package.json of its own, so Node would
 * load `dist/index.js` as CommonJS and fail on its `import` statements. Shipping
 * `{"type":"module"}` next to the build output keeps ESM semantics everywhere —
 * in the Vercel function and with `node dist/index.js` locally.
 */
import { writeFileSync } from 'node:fs';

writeFileSync(
  new URL('../dist/package.json', import.meta.url),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
);
