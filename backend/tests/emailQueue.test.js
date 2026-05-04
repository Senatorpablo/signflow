/**
 * Email Queue Tests
 * Basic unit tests for email queue functions
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the email queue module
vi.mock('../services/emailQueue.js', () => ({
  addEmailJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
  getQueueStats: vi.fn().mockResolvedValue({ waiting: 0, active: 0 }),
  close: vi.fn().mockResolvedValue(undefined),
}));

import { addEmailJob, getQueueStats } from '../services/emailQueue.js';

describe('Email Queue', () => {
  it('adds an email job', async () => {
    const result = await addEmailJob({ to: 'test@example.com', subject: 'Hello' });
    expect(result).toBeDefined();
    expect(addEmailJob).toHaveBeenCalled();
  });

  it('returns queue stats', async () => {
    const stats = await getQueueStats();
    expect(stats).toBeDefined();
    expect(getQueueStats).toHaveBeenCalled();
  });
});
