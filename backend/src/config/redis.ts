import { createClient } from 'redis';
import { config } from './index.js';
import { logger } from './logger.js';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({ url: config.REDIS_URL });
    redisClient.on('error', (err) => logger.error({ message: 'Redis Client Error', error: err.message }));
    await redisClient.connect();
  }
  return redisClient;
}
