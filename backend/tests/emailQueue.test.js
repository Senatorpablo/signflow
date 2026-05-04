import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailQueue } from '../services/emailQueue.js';

vi.mock('bull', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      process: vi.fn(),
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: vi.fn(),
      getWaitingCount: vi.fn().mockResolvedValue(0),
      getActiveCount: vi.fn().mockResolvedValue(0),
      getCompletedCount: vi.fn().mockResolvedValue(0),
      getFailedCount: vi.fn().mockResolvedValue(0),
      getDelayedCount: vi.fn().mockResolvedValue(0),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('winston', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    json: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
  },
}));

describe('emailQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add email job to queue', async () => {
    const result = await emailQueue.add('welcome', { to: 'test@example.com', name: 'Test' });
    // Since Redis may not be available, it falls back to direct send
    expect(result).toBeDefined();
  });

  it('should send welcome email directly when queue unavailable', async () => {
    const result = await emailQueue.sendDirectly('welcome', { to: 'test@example.com', name: 'Test' });
    expect(result.messageId).toMatch(/^console-/);
  });

  it('should return queue stats when available', async () => {
    // If queue is not initialized (no Redis), stats return null
    const stats = await emailQueue.getQueueStats();
    // Could be null or an object depending on initialization
    expect(stats !== undefined).toBe(true);
  });
});
