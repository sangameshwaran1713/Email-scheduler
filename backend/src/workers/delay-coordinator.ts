import { getRedisClient } from '../config/redis.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export async function reserveDelaySlot(senderId: string): Promise<{ allowed: boolean; waitMs: number }> {
  const redis = await getRedisClient();
  const key = `sender:lastSendAt:${senderId}`;
  const minDelayMs = config.MIN_EMAIL_DELAY_MS || 2000;
  const now = Date.now();

  const lastSendAtStr = await redis.get(key);
  const lastSendAt = lastSendAtStr ? parseInt(lastSendAtStr, 10) : 0;
  const timeSinceLastSend = now - lastSendAt;

  if (timeSinceLastSend < minDelayMs) {
    const waitMs = minDelayMs - timeSinceLastSend;
    logger.debug({
      message: 'Min delay window active',
      senderId,
      waitMs,
      minDelayMs,
    });
    return { allowed: false, waitMs };
  }

  // Reserve this send timestamp in Redis
  await redis.set(key, now.toString(), { EX: 3600 });
  return { allowed: true, waitMs: 0 };
}
