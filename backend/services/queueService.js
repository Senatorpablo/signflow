/**
 * Queue Service - Background job processing with Bull/Redis
 */

import Queue from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create queues
const emailQueue = new Queue('email', redisUrl);
const signatureQueue = new Queue('signature', redisUrl);

// Process email jobs
emailQueue.process(async (job) => {
  console.log('Processing email job:', job.id, job.data);
  return { sent: true };
});

// Process signature jobs
signatureQueue.process(async (job) => {
  console.log('Processing signature job:', job.id);
  return { processed: true };
});

export const setupBullQueues = async () => {
  console.log('✅ Bull queues initialized');
};

export const closeQueues = async () => {
  await emailQueue.close();
  await signatureQueue.close();
  console.log('🔌 Bull queues closed');
};

export const getQueueStats = async () => {
  return {
    email: await emailQueue.getJobCounts(),
    signature: await signatureQueue.getJobCounts(),
  };
};

export default { setupBullQueues, closeQueues, getQueueStats, emailQueue, signatureQueue };
