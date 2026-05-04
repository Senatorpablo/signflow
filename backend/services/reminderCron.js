/**
 * Reminder Cron - Automated email reminders
 */

import cron from 'node-cron';

let task = null;

export const start = () => {
  if (task) return;

  // Run every hour
  task = cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running reminder cron...');
    // Check for pending signatures and send reminders
  });

  console.log('✅ Reminder cron started');
};

export const stop = () => {
  if (task) {
    task.stop();
    task = null;
    console.log('⏹️ Reminder cron stopped');
  }
};

export default { start, stop };
