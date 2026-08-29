import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions, getEmailQueue, EmailJobData } from '../queues/email.queue.js';
import { getPrismaClient } from '../db/prisma.js';
import { sendEmail } from '../email/smtp.service.js';
import { reserveRateLimitSlot, getNextHourWindowStart, getCurrentHourWindow, shouldSendSlackRateLimitNotification } from './rate-limiter.js';
import { reserveDelaySlot } from './delay-coordinator.js';
import { sendSlackRateLimitAlert } from '../slack/slack.service.js';
import { updateEmailDocumentStatus } from '../elasticsearch/email.search.js';
import { getRedisClient } from '../config/redis.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId } = job.data;
  const prisma = getPrismaClient();

  logger.info({ message: 'Worker received email job', jobId: job.id, emailId });

  // 1. Fetch Email record from PostgreSQL
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { sender: true },
  });

  if (!email) {
    logger.warn({ message: 'Email record not found in DB', emailId });
    return;
  }

  // Idempotency Check: if already sent or processing, abort
  if (email.status !== 'SCHEDULED') {
    logger.info({ message: 'Email is not in SCHEDULED status; skipping execution', emailId, status: email.status });
    return;
  }

  // 2. Check and reserve rate limit slot
  const senderId = email.senderId;
  const hourlyLimit = config.MAX_EMAILS_PER_HOUR;
  const rateSlotAvailable = await reserveRateLimitSlot(senderId, hourlyLimit);

  if (!rateSlotAvailable) {
    const hourWindow = getCurrentHourWindow();
    const redis = await getRedisClient();

    // Deterministic staggered rescheduling to prevent top-of-hour thundering herd loops
    const deferKey = `sender:deferredCount:${senderId}:${hourWindow}`;
    const deferIndex = await redis.incr(deferKey);
    await redis.expire(deferKey, 7200);

    const minDelayMs = config.MIN_EMAIL_DELAY_MS || 2000;
    const staggeredOffsetMs = (deferIndex - 1) * minDelayMs;

    const nextHourStart = getNextHourWindowStart();
    const staggeredScheduledAt = new Date(nextHourStart.getTime() + staggeredOffsetMs);
    const delayMs = Math.max(0, staggeredScheduledAt.getTime() - Date.now());

    logger.warn({
      message: 'Rate limit reached. Staggering job rescheduling to next hour window',
      emailId,
      senderId,
      deferIndex,
      staggeredScheduledAt: staggeredScheduledAt.toISOString(),
      delayMs,
    });

    // Update scheduledAt in PostgreSQL
    await prisma.email.update({
      where: { id: emailId },
      data: { scheduledAt: staggeredScheduledAt },
    });

    // Reschedule in BullMQ with staggered delay
    const queue = await getEmailQueue();
    await queue.add(
      'emailQueue',
      { emailId },
      {
        delay: delayMs,
        jobId: emailId, // Deterministic jobId prevents duplicate enqueueing
      }
    );

    // Send Slack notification (max 1 notification per sender per hourly window)
    const shouldNotify = await shouldSendSlackRateLimitNotification(senderId, hourWindow);
    if (shouldNotify) {
      await sendSlackRateLimitAlert(email.userId, email.sender?.email || senderId, hourlyLimit);
    }

    return;
  }

  // 3. Enforce minimum delay interval between sends
  const { allowed, waitMs } = await reserveDelaySlot(senderId);
  if (!allowed) {
    logger.debug({ message: 'Min delay window active; retrying job', emailId, waitMs });
    throw new Error(`Minimum send delay active (${waitMs}ms required). Re-queueing job.`);
  }

  // 4. Atomic Status Transition: SCHEDULED -> PROCESSING
  const updatedCount = await prisma.email.updateMany({
    where: { id: emailId, status: 'SCHEDULED' },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
    },
  });

  if (updatedCount.count === 0) {
    logger.warn({ message: 'Atomic transition failed: email is already being processed by another worker', emailId });
    return;
  }

  // 5. Send Email via Ethereal SMTP
  try {
    const senderEmail = email.sender?.email || `${senderId}@ethereal.email`;
    const result = await sendEmail({
      from: senderEmail,
      to: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    // 6. Transition Status to SENT
    const sentAt = new Date();
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt,
      },
    });

    // 7. Update Elasticsearch
    await updateEmailDocumentStatus(emailId, 'SENT', sentAt);

    logger.info({
      message: 'Email successfully processed and SENT',
      emailId,
      recipient: email.recipient,
      previewUrl: result.previewUrl,
    });
  } catch (sendErr: any) {
    logger.error({
      message: 'Email delivery failed',
      emailId,
      error: sendErr.message || sendErr,
    });

    // Transition Status to FAILED (or allow BullMQ backoff retry)
    await prisma.email.update({
      where: { id: emailId },
      data: { status: 'FAILED' },
    });

    await updateEmailDocumentStatus(emailId, 'FAILED', null);

    throw sendErr; // Throw to trigger BullMQ retry policy
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const connection = getRedisConnectionOptions();
  const concurrency = config.WORKER_CONCURRENCY || 10;

  logger.info({
    message: 'Initializing BullMQ Email Worker process',
    concurrency,
    redisHost: connection.host,
    redisPort: connection.port,
  });

  const worker = new Worker<EmailJobData>('emailQueue', processEmailJob, {
    connection,
    concurrency,
  });

  worker.on('completed', (job: Job<EmailJobData>) => {
    logger.info({ message: 'BullMQ Job completed', jobId: job.id });
  });

  worker.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
    logger.error({ message: 'BullMQ Job failed', jobId: job?.id, error: err.message });
  });

  return worker;
}

// If invoked directly via `npm run dev:worker`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('email.worker.ts')) {
  startEmailWorker();
}
