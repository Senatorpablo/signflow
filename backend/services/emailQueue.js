/**
 * Email Queue - Simple wrapper around Bull queue for emails
 */

import Queue from 'bull';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let emailQueue;

try {
  emailQueue = new Queue('email', redisUrl);
} catch (e) {
  console.log('⚠️ Redis not available, using dummy queue');
  emailQueue = {
    add: async () => ({ id: 'dummy' }),
    getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    close: async () => {},
  };
}

export const addEmailJob = async (data) => {
  return emailQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
};

export const getQueueStats = async () => {
  return emailQueue.getJobCounts();
};

export const close = async () => {
  await emailQueue.close();
};

export default { addEmailJob, getQueueStats, close, emailQueue };
