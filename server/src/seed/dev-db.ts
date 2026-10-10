/**
 * Dev-only helper: starts an in-memory MongoDB and prints its URI.
 * Useful when MongoDB is not installed locally:
 *   npm run db:dev -w server     → prints mongodb://127.0.0.1:PORT/qiststore
 * Note: data is NOT persisted after the process exits.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const server = await MongoMemoryServer.create();
  console.log(`\nIn-memory MongoDB ready: ${server.getUri('qiststore')}`);
  console.log('Set MONGO_URI to this value, then run: npm run seed -w server');
  console.log('Press Ctrl+C to stop.\n');

  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start in-memory MongoDB:', err.message);
  console.error('Hint: on Windows install the Visual C++ redistributable, or run MongoDB locally.');
  process.exit(1);
});
