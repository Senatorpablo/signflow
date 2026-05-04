/**
 * SignFlow Main Server
 * Express application with middleware, routes, DB connection, and graceful shutdown
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Route imports
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import templateRoutes from './routes/templates.js';
import signatureRoutes from './routes/signatures.js';
import webhookRoutes from './routes/webhooks.js';

// DB
import { prisma, testConnection, disconnect } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// ==========================================
// HEALTH CHECK — queries database
// ==========================================
app.get('/health', async (req, res) => {
  try {
    const dbOk = await testConnection();
    res.json({
      status: dbOk ? 'healthy' : 'degraded',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ==========================================
// API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 + Error handling
app.use(notFound);
app.use(errorHandler);

// ==========================================
// START SERVER with DB connection
// ==========================================
let server;

const startServer = async () => {
  // Verify DB is reachable before binding port
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ Cannot start: database unreachable');
    process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log(`🚀 SignFlow server running on port ${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
  });
};

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      await disconnect();
      console.log('✅ Server closed cleanly');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      console.error('⏱️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    await disconnect();
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

// Bootstrap
startServer();

export { app, server };
export default app;
