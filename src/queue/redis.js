import 'dotenv/config';
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({
  socket: {
    connectTimeout: 5_000,
    reconnectStrategy: false,
  },
  url: redisUrl,
});

redis.on('error', (error) => {
  console.error('Redis client error:', error);
});

let connectPromise;

export function getRedisClient() {
  if (!redis.isOpen) {
    connectPromise ??= redis.connect().catch((error) => {
      connectPromise = undefined;
      throw error;
    });
  }

  return connectPromise ? connectPromise.then(() => redis) : Promise.resolve(redis);
}

export async function closeRedisConnection() {
  if (redis.isOpen) {
    // A worker can be blocked indefinitely in BRPOP. Destroying the local
    // connection releases that command immediately so shutdown can proceed.
    redis.disconnect();
  }
  connectPromise = undefined;
}
