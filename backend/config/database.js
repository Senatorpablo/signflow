/**
 * SignFlow Database Configuration
 * PostgreSQL connection using Prisma ORM with pooling & graceful shutdown
 */

import { PrismaClient } from '@prisma/client';

/**
 * Create Prisma client with query logging in development
 */
const createPrismaClient = () => {
  const isDev = process.env.NODE_ENV === 'development';

  const client = new PrismaClient({
    log: isDev
      ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
      : [
        { emit: 'stdout', level: 'error' },
      ],
  });

  // Log slow queries in development
  if (isDev) {
    client.$on('query', (e) => {
      if (e.duration > 100) {
        console.warn(`⚠️  Slow query (${e.duration}ms): ${e.query.substring(0, 100)}...`);
      }
    });
  }

  return client;
};

// Singleton Prisma instance
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
export const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Gracefully disconnect from database
 */
export const disconnect = async () => {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
};

/**
 * Execute a transaction with automatic retry
 * @param {Function} fn - Transaction function
 * @param {number} maxRetries - Maximum retry attempts
 */
export const withRetry = async (fn, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      lastError = error;

      // Retry on deadlock or connection issues
      if (error.code === 'P2034' || error.code === 'P1001') {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`⚠️  Transaction failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

export { prisma };
export default prisma;
