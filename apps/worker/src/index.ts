import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Background worker process. In Phase 3 this hosts the monthly billing
 * cron and notification dispatch (see PLAN.md §6). For now it boots,
 * connects to Redis, and registers a placeholder queue so the plumbing
 * is verified end-to-end.
 */
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const BILLING_QUEUE = 'billing';

const billingQueue = new Queue(BILLING_QUEUE, { connection });

const worker = new Worker(
  BILLING_QUEUE,
  async (job) => {
    // Placeholder processor — replaced by invoice generation in Phase 3.
    console.log(`[worker] processing job ${job.name} (${job.id})`);
  },
  { connection },
);

worker.on('ready', () => console.log('[worker] ready, listening on queue:', BILLING_QUEUE));
worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] received ${signal}, shutting down...`);
  await worker.close();
  await billingQueue.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
