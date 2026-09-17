import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db/pool.js';
import { closeRedisConnection } from './queue/redis.js';
import { startCoordinator } from './coordinator.js';

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`Task API listening on http://localhost:${port}`);
});
const stopCoordinator = startCoordinator();

async function shutdown(signal) {
  console.log(`API received ${signal}; shutting down`);
  stopCoordinator();
  server.close();
  await Promise.allSettled([pool.end(), closeRedisConnection()]);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
