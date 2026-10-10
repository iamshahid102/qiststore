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
  });

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB connection did not become ready');
  }
  await mongoose.connection.db.admin().ping();

  logger.info({ uri: uri.replace(/\/\/[^@]*@/, '//***@') }, 'MongoDB connected (verified)');
  return conn;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
