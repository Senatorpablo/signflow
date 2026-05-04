/**
 * Error Handling Middleware
 * Centralized error handling with logging
 */

import { Prisma } from '@prisma/client';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found middleware
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, null, 'ROUTE_NOT_FOUND');
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;
  let errorCode = err.code || 'INTERNAL_ERROR';

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        details = err.meta?.target ? `Unique constraint failed on: ${err.meta.target.join(', ')}` : null;
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        errorCode = 'NOT_FOUND';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        errorCode = 'FOREIGN_KEY_VIOLATION';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid relation operation';
        errorCode = 'RELATION_ERROR';
        break;
      default:
        statusCode = 400;
        message = 'Database error';
        errorCode = `PRISMA_${err.code}`;
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.message;
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Handle validation errors (express-validator)
  if (err.array && typeof err.array === 'function') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.array();
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
    errorCode = 'FILE_TOO_LARGE';
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 413;
    message = 'Too many files';
    errorCode = 'TOO_MANY_FILES';
  }

  // Log error (but not in test environment)
  if (process.env.NODE_ENV !== 'test') {
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode,
      errorCode,
      message,
      details: statusCode >= 500 ? err.stack : undefined,
      userId: req.user?.id,
      ip: req.ip,
    };

    if (statusCode >= 500) {
      console.error('❌ Server Error:', logData);
    } else {
      console.warn('⚠️  Client Error:', {
        statusCode,
        errorCode,
        message,
        path: req.path,
      });
    }
  }

  // Send response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  };

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper
 * Eliminates need for try/catch in route handlers
 * @param {Function} fn
 * @returns {Function}
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Wrapper for controller methods
 * @param {Function} fn
 * @returns {Function}
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
