/**
 * SignFlow Authentication Routes
 * Registration, login, token generation using Prisma
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import emailQueue from '../services/emailQueue.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Register
router.post('/register', catchAsync(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw new ApiError(400, 'Email, password, and name required', null, 'MISSING_FIELDS');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'Email already registered', null, 'DUPLICATE_EMAIL');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'USER',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);

  // Send welcome email (queued)
  emailQueue.addEmailJob('welcome', { to: user.email, name: user.name }).catch(() => {
    // Non-blocking — don't fail registration if email fails
  });

  res.status(201).json({
    user,
    token,
  });
}));

// Login
router.post('/login', catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password required', null, 'MISSING_FIELDS');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid credentials', null, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials', null, 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  });
}));

// Get me
router.get('/me', catchAsync(async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new ApiError(401, 'Unauthorized', null, 'UNAUTHORIZED');
  }

  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found', null, 'USER_NOT_FOUND');
  }

  res.json(user);
}));

export default router;
