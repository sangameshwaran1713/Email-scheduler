import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { getEmailQueue } from './email.queue.js';

export async function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  try {
    const emailQueue = await getEmailQueue();

    createBullBoard({
      queues: [new BullMQAdapter(emailQueue)],
      serverAdapter: serverAdapter,
    });
  } catch (err: any) {
    // Redis offline fallback
  }

  return serverAdapter.getRouter();
}
