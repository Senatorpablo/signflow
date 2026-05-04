/**
 * SignFlow Main Server
 * Express application with middleware, routes, and graceful shutdown
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { testConnection } from './config/database.js';
import { setupBullQueues } from './services/queueService.js';

// Route imports
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import templateRoutes from './routes/templates.js';
import signatureRoutes from './routes/signatures.js';
import webhookRoutes from './routes/webhooks.js';
import organizationRoutes from './routes/organizations.js';
import userRoutes from './routes/users.js';
import subscriptionRoutes from './routes/subscriptions.js';

// Middleware imports
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
}));

// Compression
app.use(compression());

// Request ID for tracing
app.use(requestId);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms [:date[iso]]', {
    skip: (req) => req.path === '/health',
  }));
}

// ==========================================
// SWAGGER DOCUMENTATION
// ==========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SignFlow API',
      version: '1.0.0',
      description: 'Self-hosted e-signature platform API',
      contact: {
        name: 'SignFlow Support',
        email: 'support@signflow.io',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ==========================================
// ROUTES
// ==========================================

// API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SignFlow API Documentation',
}));

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await testConnection().catch(() => false);

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(notFound);
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================

const server = app.listen(PORT, async () => {
  console.log(`🚀 SignFlow server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Test database connection
  await testConnection();

  // Setup background queues
  await setupBullQueues();
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('🔒 HTTP server closed');

    // Close database connection
    const { disconnect } = await import('./config/database.js');
    await disconnect();

    // Close Redis/Bull queues
    const { closeQueues } = await import('./services/queueService.js');
    await closeQueues();

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export { app, server };
export default app;
