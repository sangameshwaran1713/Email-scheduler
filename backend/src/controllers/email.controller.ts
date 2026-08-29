import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { getPrismaClient } from '../db/prisma.js';
import { getEmailQueue } from '../queues/email.queue.js';
import { indexEmailDocument, searchUserEmails } from '../elasticsearch/email.search.js';
import { logger } from '../config/logger.js';

const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO start time format',
  }),
  delayBetweenEmails: z.number().positive('Delay between emails must be positive'),
  hourlyLimit: z.number().positive('Hourly limit must be positive'),
  recipients: z.array(z.string().email('Invalid email address format')).min(1, 'At least one recipient is required'),
  senderId: z.string().optional(),
});

export async function scheduleEmailCampaign(req: Request, res: Response) {
  const userId = req.userId!;
  const parsedData = scheduleEmailSchema.parse(req.body);

  const prisma = getPrismaClient();

  // Resolve senderId or fallback to user's default sender
  let senderId = parsedData.senderId;
  if (!senderId) {
    let sender = await prisma.sender.findFirst({ where: { userId } });
    if (!sender) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      sender = await prisma.sender.create({
        data: {
          userId,
          email: user?.email || 'sender@reachinbox.ai',
          name: user?.name || 'Default Sender',
        },
      });
    }
    senderId = sender.id;
  }

  // Sanitize & deduplicate recipients
  const rawRecipients = parsedData.recipients.map((r) => r.trim().toLowerCase());
  const uniqueRecipients = Array.from(new Set(rawRecipients));
  const rejectedCount = parsedData.recipients.length - uniqueRecipients.length;

  const campaignStartTime = new Date(parsedData.startTime);
  const prismaEmailRecords: any[] = [];
  const bullMqBulkJobs: any[] = [];

  const now = Date.now();

  for (let i = 0; i < uniqueRecipients.length; i++) {
    const recipient = uniqueRecipients[i];
    const delayOffsetMs = i * parsedData.delayBetweenEmails;
    const scheduledAt = new Date(campaignStartTime.getTime() + delayOffsetMs);

    // Compute unique SHA256 idempotency key
    const idempotencyRaw = `${userId}:${senderId}:${recipient}:${parsedData.subject}:${scheduledAt.toISOString()}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencyRaw).digest('hex');

    const emailId = crypto.randomUUID();

    prismaEmailRecords.push({
      id: emailId,
      userId,
      senderId,
      recipient,
      subject: parsedData.subject,
      body: parsedData.body,
      startTime: campaignStartTime,
      scheduledAt,
      status: 'SCHEDULED',
      jobId: emailId,
      idempotencyKey,
      attempts: 0,
    });

    const delay = Math.max(0, scheduledAt.getTime() - now);

    bullMqBulkJobs.push({
      name: 'emailQueue',
      data: { emailId },
      opts: {
        delay,
        jobId: emailId, // Deterministic jobId for restart persistence & idempotency
      },
    });
  }

  // Efficient batch insertion in PostgreSQL via createMany
  await prisma.email.createMany({
    data: prismaEmailRecords,
    skipDuplicates: true,
  });

  // Fast bulk enqueueing in Redis via BullMQ queue.addBulk
  const queue = await getEmailQueue();
  await queue.addBulk(bullMqBulkJobs);

  // Asynchronously index in Elasticsearch
  Promise.all(prismaEmailRecords.map((record) => indexEmailDocument(record))).catch((err) => {
    logger.warn({ message: 'Elasticsearch batch index warning', error: err });
  });

  const firstScheduled = prismaEmailRecords[0]?.scheduledAt;
  const lastScheduled = prismaEmailRecords[prismaEmailRecords.length - 1]?.scheduledAt;

  logger.info({
    message: 'Email campaign scheduled successfully via bulk operations',
    userId,
    count: prismaEmailRecords.length,
    rejected: rejectedCount,
  });

  res.status(201).json({
    success: true,
    message: `Successfully scheduled ${prismaEmailRecords.length} emails.`,
    data: {
      scheduledCount: prismaEmailRecords.length,
      validRecipients: uniqueRecipients.length,
      rejectedRecipients: rejectedCount,
      firstScheduledTime: firstScheduled ? firstScheduled.toISOString() : null,
      lastScheduledTime: lastScheduled ? lastScheduled.toISOString() : null,
    },
  });
}

export async function getScheduledEmails(req: Request, res: Response) {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const prisma = getPrismaClient();

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { userId, status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { email: true, name: true },
          },
        },
      }),
      prisma.email.count({
        where: { userId, status: 'SCHEDULED' },
      }),
    ]);

    return res.json({
      success: true,
      data: emails,
      page,
      limit,
      total,
    });
  } catch (err: any) {
    logger.warn({ message: 'DB query fallback for getScheduledEmails', error: err.message });
    return res.json({
      success: true,
      data: [],
      page,
      limit,
      total: 0,
    });
  }
}

export async function getSentEmails(req: Request, res: Response) {
  const userId = req.userId!;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  try {
    const prisma = getPrismaClient();

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { userId, status: { in: ['SENT', 'FAILED'] } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { email: true, name: true },
          },
        },
      }),
      prisma.email.count({
        where: { userId, status: { in: ['SENT', 'FAILED'] } },
      }),
    ]);

    return res.json({
      success: true,
      data: emails,
      page,
      limit,
      total,
    });
  } catch (err: any) {
    logger.warn({ message: 'DB query fallback for getSentEmails', error: err.message });
    return res.json({
      success: true,
      data: [],
      page,
      limit,
      total: 0,
    });
  }
}

export async function searchEmails(req: Request, res: Response) {
  const userId = req.userId!;
  const query = (req.query.q as string) || '';
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  if (!query.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Search query parameter (q) is required',
    });
  }

  const result = await searchUserEmails(userId, query, page, limit);

  res.json({
    success: true,
    data: result.data,
    page: result.page,
    limit: result.limit,
    total: result.total,
  });
}
