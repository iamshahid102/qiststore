/**
 * Push deployment env vars to the linked Vercel project.
 *
 * Reads values from server/.env (never printed), and upserts them into the
 * project for the given targets through Vercel's REST API.
 *
 *   node scripts/push-vercel-env.mjs [--targets production,preview] [--dry]
 *
 * Requires `.vercel/project.json` (run `vercel link` first) and ~/.vercel auth.
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// NODE_ENV is provided by Vercel; PORT/LOG_LEVEL/TTLs keep their code defaults.
const KEYS = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_FOLDER',
  'NEXT_PUBLIC_SITE_URL',
];

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const targetsArg = args[args.indexOf('--targets') + 1];
const targets = (args.includes('--targets') ? targetsArg : 'production,preview')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const authPath = path.join(homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
const auth = JSON.parse(readFileSync(authPath, 'utf8'));
const project = JSON.parse(readFileSync(path.join(ROOT, '.vercel', 'project.json'), 'utf8'));

const api = async (url, init = {}) => {
  const res = await fetch(`https://api.vercel.com${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status} ${JSON.stringify(json)}`);
  return json;
};

const sources = { ...readEnvFile(path.join(ROOT, 'server', '.env')) };

// NEXT_PUBLIC_SITE_URL may only exist in the client env file.
const clientEnv = readEnvFile(path.join(ROOT, 'client', '.env.local'));
if (!sources.NEXT_PUBLIC_SITE_URL && clientEnv.NEXT_PUBLIC_SITE_URL) {
  sources.NEXT_PUBLIC_SITE_URL = clientEnv.NEXT_PUBLIC_SITE_URL;
}

const desired = KEYS.map((key) => ({ key, value: sources[key] })).filter((e) => e.value);
const missing = KEYS.filter((key) => !sources[key]);

console.log(`project: ${project.projectName} (${project.projectId})`);
console.log(`targets: ${targets.join(', ')}`);
console.log(`pushing: ${desired.map((e) => e.key).join(', ')}`);
if (missing.length) console.log(`skipped (not set locally): ${missing.join(', ')}`);
if (dry) process.exit(0);

const existing = await api(`/v9/projects/${project.projectId}/env`);
const byKey = new Map();
for (const e of existing.envs ?? []) {
  if (!byKey.has(e.key)) byKey.set(e.key, []);
  byKey.get(e.key).push(e);
}

// Remove existing entries for our keys (so the new value + targets are exact).
for (const key of KEYS) {
  for (const entry of byKey.get(key) ?? []) {
    await api(`/v9/projects/${project.projectId}/env/${entry.id}`, { method: 'DELETE' });
    console.log(`  removed old ${key} (${entry.target?.join('+') || 'all'})`);
  }
}

const created = await api(`/v10/projects/${project.projectId}/env`, {
  method: 'POST',
  body: JSON.stringify(
    desired.map((e) => ({ key: e.key, value: e.value, type: 'encrypted', target: targets })),
  ),
});
console.log(`✓ created ${created.created?.length ?? desired.length} env vars for ${targets.join(', ')}`);
