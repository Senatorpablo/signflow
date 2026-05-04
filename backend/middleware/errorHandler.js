/**
 * Error Handler Middleware
 */

export class ApiError extends Error {
  constructor(status, message, details = null, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};
