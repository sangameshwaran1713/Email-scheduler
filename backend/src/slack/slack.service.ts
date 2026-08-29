import { WebClient } from '@slack/web-api';
import crypto from 'crypto';
import { getPrismaClient } from '../db/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

function getEncryptionKey(): Buffer {
  const rawKey = config.ENCRYPTION_KEY;
  if (!rawKey || rawKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long for AES-256-GCM');
  }
  return crypto.scryptSync(rawKey, 'reachinbox-slack-salt', 32);
}

export function encryptSlackToken(plainToken: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12-byte IV standard for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plainToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSlackToken(encryptedToken: string): string {
  const parts = encryptedToken.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid AES-256-GCM encrypted token format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function sendSlackRateLimitAlert(
  userId: string,
  senderEmail: string,
  hourlyLimit: number
): Promise<boolean> {
  try {
    const prisma = getPrismaClient();
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConn || !slackConn.isConnected || !slackConn.accessToken) {
      logger.info({ message: 'Slack not connected for user; skipping alert', userId });
      return false;
    }

    const decryptedToken = decryptSlackToken(slackConn.accessToken);
    const client = new WebClient(decryptedToken);

    const alertMessage = `⚠️ *Email Rate Limit Reached*\n` +
      `Sender: \`${senderEmail}\` reached its configured hourly limit of *${hourlyLimit} emails/hour*.\n` +
      `Remaining scheduled emails have been deferred to the next available window.`;

    await client.chat.postMessage({
      channel: slackConn.slackUserId,
      text: alertMessage,
    });

    logger.info({ message: 'Slack rate-limit alert sent successfully via AES-256-GCM authenticated connection', userId, senderEmail });
    return true;
  } catch (error: any) {
    logger.error({
      message: 'Failed to send Slack rate-limit alert',
      userId,
      senderEmail,
      error: error.message || error,
    });
    return false;
  }
}
