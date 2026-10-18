import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let listenersAttached = false;

function attachConnectionListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

/**
 * Connect and VERIFY readiness.
 *
 * Mongoose can resolve `connect()` while the driver is still negotiating, so we
 * explicitly confirm readyState === 1 and ping the admin database before
 * reporting success — otherwise a missing MongoDB looks "connected" in logs
 * while every query fails.
 */
export async function connectDb(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  attachConnectionListeners();
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    // Serverless-friendly pool: many short-lived instances, so keep the pool
    // small and never hold idle sockets (a frozen instance resumes with dead
    // sockets otherwise, which is what made /health flap to "degraded").
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
  });

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB connection did not become ready');
  }
  await mongoose.connection.db.admin().ping();
  everConnected = true;

  logger.info({ uri: uri.replace(/\/\/[^@]*@/, '//***@') }, 'MongoDB connected (verified)');
  return conn;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Promise for the FIRST connection attempt, shared process-wide.
 *
 * On Vercel the platform starts accepting requests as soon as the process is
 * up — sometimes before `connect()` resolves. Without this, those first
 * requests see readyState 0 and answer 503 DB_UNAVAILABLE even though the
 * database is perfectly reachable a moment later.
 */
let initialConnect: Promise<unknown> | null = null;
let initialSettled = false;
/** True once the process has had at least one verified connection. */
let everConnected = false;
/** In-flight reconnect attempt (serverless instances get frozen/idle-killed). */
let reconnect: Promise<unknown> | null = null;

export function connectDbOnce(uri?: string): Promise<unknown> {
  initialConnect ??= connectDb(uri).finally(() => {
    initialSettled = true;
  });
  return initialConnect;
}

/** Resolves after `promise` settles or `timeoutMs` passes — never rejects. */
async function raceTimeout(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([promise.catch(() => undefined), timeout]);
  if (timer) clearTimeout(timer);
}

/**
 * Make sure there is a live connection before handling a request.
 *
 * Vercel starts serving as soon as the process is up (sometimes before the
 * first handshake finishes) and freezes idle instances, after which the driver
 * may still be reconnecting. Rather than answering 503 to those first
 * requests, wait briefly for the in-flight attempt — and, once this process has
 * connected before, kick off a reconnect if the connection went away.
 *
 * Never throws and never waits longer than `timeoutMs`.
 */
export async function waitForDb(timeoutMs = 1500): Promise<boolean> {
  if (isDbConnected()) return true;

  if (initialConnect && !initialSettled) {
    await raceTimeout(initialConnect, timeoutMs);
    if (isDbConnected()) return true;
  }

  // readyState 2 = the driver is already reconnecting on its own; give it the
  // time budget instead of opening a second connection on top of it.
  if (mongoose.connection.readyState === 2) return pollConnected(timeoutMs);

  if (!everConnected) return false;

  reconnect ??= connectDb().finally(() => {
    reconnect = null;
  });
  await raceTimeout(reconnect, timeoutMs);
  return isDbConnected();
}

async function pollConnected(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isDbConnected()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return isDbConnected();
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
