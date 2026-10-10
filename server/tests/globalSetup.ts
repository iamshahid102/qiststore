import 'dotenv/config';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server: MongoMemoryServer | undefined;
let usingExternalDb = false;

/**
 * Prefer a throwaway in-memory MongoDB. On machines where that binary cannot
 * start (e.g. missing Visual C++ runtime on Windows), fall back to the
 * configured MONGO_URI but ONLY on a dedicated `<db>_test` database so the
 * development/demo data is never touched. If neither is available the
 * DB-backed suites self-skip instead of failing.
 */
export async function setup() {
  process.env.NODE_ENV = 'test';

  try {
    server = await MongoMemoryServer.create();
    process.env.MONGO_URI = server.getUri('qiststore-test');
    process.env.MONGO_AVAILABLE = '1';
    return;
  } catch {
    // fall through to external database
  }

  const configured = process.env.MONGO_URI;
  if (!configured) {
    process.env.MONGO_AVAILABLE = '0';
    return;
  }

  try {
    const testUri = configured.replace(/\/[^/?]+(\?|$)/, '/qiststore_test$1');
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 8000 });
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) throw new Error('not ready');
    await mongoose.connection.db.admin().ping();
    await mongoose.disconnect();

    process.env.MONGO_URI = testUri;
    process.env.MONGO_AVAILABLE = '1';
    usingExternalDb = true;
    console.warn('[test] In-memory MongoDB unavailable — using isolated test database (qiststore_test).');
  } catch {
    process.env.MONGO_AVAILABLE = '0';
  }
}

export async function teardown() {
  if (server) {
    await server.stop();
    return;
  }
  if (usingExternalDb && process.env.MONGO_URI) {
    // Drop the isolated test database so nothing is left behind.
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await conn.connection.dropDatabase();
    await mongoose.disconnect();
  }
}
