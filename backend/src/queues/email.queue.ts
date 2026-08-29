import { Queue } from 'bullmq';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export interface EmailJobData {
  emailId: string;
}

let emailQueue: Queue<EmailJobData> | null = null;

export function getRedisConnectionOptions() {
  const url = new URL(config.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: url.port ? parseInt(url.port, 10) : 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
}

export async function getEmailQueue(): Promise<Queue<EmailJobData>> {
  if (!emailQueue) {
    const connection = getRedisConnectionOptions();
    emailQueue = new Queue<EmailJobData>('emailQueue', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: false, // Keep completed jobs in Redis for audit & Bull Board
        removeOnFail: false,     // Keep failed jobs in Redis for inspection & retry
      },
    });

    logger.info({ message: 'BullMQ Email Queue initialized', queueName: 'emailQueue' });
  }

  return emailQueue;
}
