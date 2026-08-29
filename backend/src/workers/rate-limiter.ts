import { getRedisClient } from '../config/redis.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export function getCurrentHourWindow(date: Date = new Date()): string {
  // Format as YYYY-MM-DD-HH
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

export function getNextHourWindowStart(date: Date = new Date()): Date {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
}

export async function reserveRateLimitSlot(
  senderId: string,
  hourlyLimit: number = config.MAX_EMAILS_PER_HOUR
): Promise<boolean> {
  const redis = await getRedisClient();
  const hourWindow = getCurrentHourWindow();
  const key = `email-rate:${senderId}:${hourWindow}`;

  // Atomic Lua script: Increment counter only if current count < hourly limit
  const luaScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local current = tonumber(redis.call('GET', key) or "0")
    if current < limit then
      redis.call('INCR', key)
      if current == 0 then
        redis.call('EXPIRE', key, 7200)
      end
      return 1
    else
      return 0
    end
  `;

  const result = await redis.eval(luaScript, {
    keys: [key],
    arguments: [hourlyLimit.toString()],
  });

  const slotReserved = result === 1;

  if (!slotReserved) {
    logger.warn({
      message: 'Sender hourly rate limit reached',
      senderId,
      hourWindow,
      hourlyLimit,
    });
  }

  return slotReserved;
}

export async function shouldSendSlackRateLimitNotification(
  senderId: string,
  hourWindow: string
): Promise<boolean> {
  const redis = await getRedisClient();
  const key = `slack-rate-notified:${senderId}:${hourWindow}`;

  // Set key only if not already set (NX) with 2-hour TTL
  const setSuccess = await redis.set(key, '1', {
    NX: true,
    EX: 7200,
  });

  return setSuccess === 'OK';
}
