/**
 * Authentication Routes
 * Registration, login, refresh tokens, OAuth, password reset
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';

import { prisma } from '../config/database.js';
import { authenticate, generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { logAudit } from '../services/auditService.js';
import { sendEmail } from '../services/emailService.js';

const router = Router();

// ==========================================
// PASSPORT OAUTH SETUP
// ==========================================

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (!user) {
            user = await prisma.user.findUnique({
              where: { email: profile.emails[0].value },
            });

            if (user) {
              // Link Google to existing account
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id },
              });
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email: profile.emails[0].value,
                  name: profile.displayName,
                  avatar: profile.photos?.[0]?.value,
                  googleId: profile.id,
                  emailVerified: true,
                },
              });
            }
          }

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
}

if (process.env.GITHUB_CLIENT_ID) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.API_URL}/api/auth/github/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findUnique({
            where: { githubId: profile.id },
          });

          if (!user) {
            const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
            
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { githubId: profile.id },
              });
            } else {
              user = await prisma.user.create({
                data: {
                  email,
                  name: profile.displayName || profile.username,
                  avatar: profile.photos?.[0]?.value,
                  githubId: profile.id,
                  emailVerified: true,
                },
              });
            }
          }

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
}

router.use(passport.initialize());

// ==========================================
// REGISTER
// ==========================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('name').trim().notEmpty().isLength({ max: 100 }),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { email, password, name } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        verificationToken: crypto.randomUUID(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create free subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'FREE',
        status: 'ACTIVE',
        documentsPerMonth: 3,
        signersPerDocument: 3,
        templatesLimit: 1,
      },
    });

    // Generate tokens
    const tokens = generateTokens({ userId: user.id });

    // Send welcome email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to SignFlow',
      template: 'welcome',
      data: { name: user.name },
    }).catch(() => {}); // Non-blocking

    // Log audit
    await logAudit({
      action: 'USER_REGISTERED',
      userId: user.id,
      metadata: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens,
      },
    });
  })
);

// ==========================================
// LOGIN
// ==========================================

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || !user.password) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check status
    if (user.status === 'SUSPENDED') {
      throw new ApiError(403, 'Account suspended');
    }

    // Generate tokens
    const tokens = generateTokens({ userId: user.id });

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log audit
    await logAudit({
      action: 'USER_LOGGED_IN',
      userId: user.id,
      metadata: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          subscription: user.subscriptions[0] || null,
        },
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        },
      },
    });
  })
);

// ==========================================
// REFRESH TOKEN
// ==========================================

router.post(
  '/refresh',
  catchAsync(async (req, res) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token required');
    }

    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new ApiError(401, 'Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new ApiError(401, 'User not found or suspended');
    }

    const tokens = generateTokens({ userId: user.id });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },
    });
  })
);

// ==========================================
// LOGOUT
// ==========================================

router.post(
  '/logout',
  authenticate,
  catchAsync(async (req, res) => {
    res.clearCookie('refreshToken');

    await logAudit({
      action: 'USER_LOGGED_OUT',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// ==========================================
// GET CURRENT USER
// ==========================================

router.get(
  '/me',
  authenticate,
  catchAsync(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        timezone: user.timezone,
        locale: user.locale,
        subscription: user.subscriptions[0] || null,
        organizations: user.memberships.map(m => ({
          ...m.organization,
          memberRole: m.role,
        })),
      },
    });
  })
);

// ==========================================
// PASSWORD RESET
// ==========================================

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid email', errors.array());
    }

    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset email has been sent.',
      });
    }

    const resetToken = crypto.randomUUID();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset your SignFlow password',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
      },
    }).catch(() => {});

    res.json({
      success: true,
      message: 'If an account exists, a reset email has been sent.',
    });
  })
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please log in.',
    });
  })
);

// ==========================================
// OAUTH ROUTES
// ==========================================

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  catchAsync(async (req, res) => {
    const tokens = generateTokens({ userId: req.user.id });

    await logAudit({
      action: 'USER_LOGGED_IN',
      userId: req.user.id,
      metadata: { method: 'google_oauth' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`
    );
  })
);

// GitHub OAuth
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  catchAsync(async (req, res) => {
    const tokens = generateTokens({ userId: req.user.id });

    await logAudit({
      action: 'USER_LOGGED_IN',
      userId: req.user.id,
      metadata: { method: 'github_oauth' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`
    );
  })
);

export default router;
