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
        removeOnComplete: { age: 3600, count: 500 }, // Keep completed jobs for 1 hour or up to 500
        removeOnFail: { age: 86400, count: 200 },    // Keep failed jobs for 24 hours or up to 200
      },
    });

    emailQueue.on('error', (err) => {
      // Suppress unhandled redis connection errors when redis is offline
    });

    logger.info({ message: 'BullMQ Email Queue initialized', queueName: 'emailQueue' });
  }

  return emailQueue;
}
