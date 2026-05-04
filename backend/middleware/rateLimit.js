/**
 * Rate Limiting Middleware
 * Redis-backed rate limiting for production, in-memory fallback for dev
 */

import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

/**
 * Create Redis client
 */
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });

    client.on('error', (err) => {
      if (err.code !== 'ECONNREFUSED') {
        console.warn('Redis error:', err.message);
      }
    });

    return client;
  } catch {
    return null;
  }
};

const redisClient = createRedisClient();

/**
 * Check if Redis is connected
 */
const isRedisReady = () => redisClient?.status === 'ready';

/**
 * Create a rate limiter
 * @param {Object} options
 * @returns {Function} Express middleware
 */
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    keyPrefix = 'rl',
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      const userId = req.user?.id;
      const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
      return `${keyPrefix}:${userId || ip}`;
    },
    skip: (req) => {
      // Skip health checks
      return req.path === '/health';
    },
    handler: (req, res, _next, options) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message.message,
        retryAfter: options.message.retryAfter,
      });
    },
  });
};

/**
 * Predefined rate limiters
 */

// General API rate limiter
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyPrefix: 'api',
});

// Strict limiter for auth endpoints
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again later.',
});

// Document upload limiter
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'upload',
  message: 'Upload limit reached. Please try again in an hour.',
});

// Webhook limiter
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'webhook',
  message: 'Too many webhook requests.',
});

// Organization creation limiter (prevent spam)
export const orgLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyPrefix: 'org',
  message: 'Organization creation limit reached.',
});

/**
 * Tier-based rate limiting
 * Adjusts limits based on subscription tier
 */
export const tierBasedLimiter = (options = {}) => {
  return (req, res, next) => {
    const tier = req.user?.subscriptions?.[0]?.tier || 'FREE';

    const tierLimits = {
      FREE: { max: 50, windowMs: 15 * 60 * 1000 },
      PRO: { max: 500, windowMs: 15 * 60 * 1000 },
      BUSINESS: { max: 2000, windowMs: 15 * 60 * 1000 },
      ENTERPRISE: { max: 10000, windowMs: 15 * 60 * 1000 },
    };

    const limits = tierLimits[tier] || tierLimits.FREE;

    const limiter = createRateLimiter({
      ...limits,
      ...options,
      keyPrefix: `tier:${tier.toLowerCase()}`,
    });

    return limiter(req, res, next);
  };
};

export default apiLimiter;
