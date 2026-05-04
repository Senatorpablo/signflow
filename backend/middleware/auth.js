/**
 * Authentication Middleware
 * JWT verification, API key auth, and role-based access control
 */

import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request
 * @returns {string|null} JWT token
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.token || null;
};

/**
 * Generate hash for API key comparison
 * @param {string} key 
 * @returns {string} SHA-256 hash
 */
const hashKey = (key) => createHash('sha256').update(key).digest('hex');

/**
 * Main authentication middleware
 * Verifies JWT or API key
 */
export const authenticate = async (req, res, next) => {
  try {
    // Try JWT first
    const token = extractToken(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
            subscriptions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!user || user.status === 'SUSPENDED') {
          return res.status(401).json({ error: 'User not found or suspended' });
        }

        req.user = user;
        req.authType = 'jwt';
        return next();
      } catch (jwtError) {
        // Token invalid, try API key
      }
    }

    // Try API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const keyHash = hashKey(apiKey);
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          owner: {
            include: {
              memberships: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (!apiKeyRecord) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      if (apiKeyRecord.revoked) {
        return res.status(401).json({ error: 'API key has been revoked' });
      }

      if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
        return res.status(401).json({ error: 'API key has expired' });
      }

      // Update last used
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: {
          lastUsedAt: new Date(),
          useCount: { increment: 1 },
        },
      });

      req.user = apiKeyRecord.owner;
      req.apiKey = apiKeyRecord;
      req.authType = 'apiKey';
      req.scopes = apiKeyRecord.scopes || [];
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication - doesn't fail if no auth
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
      if (user) {
        req.user = user;
        req.authType = 'jwt';
      }
    }
    next();
  } catch {
    next();
  }
};

/**
 * Require specific role
 * @param {string[]} allowedRoles
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Check if user is organization member with minimum role
 * @param {string} orgId - Organization ID
 * @param {string} minRole - Minimum role required
 */
export const requireOrgAccess = (minRole = 'MEMBER') => {
  const roleHierarchy = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];
  const minIndex = roleHierarchy.indexOf(minRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orgId = req.params.orgId || req.body.organizationId || req.query.organizationId;
    if (!orgId) {
      return next(); // No org context needed
    }

    const membership = req.user.memberships?.find(m => m.organizationId === orgId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const userIndex = roleHierarchy.indexOf(membership.role);
    if (userIndex < minIndex) {
      return res.status(403).json({ error: `Requires ${minRole} role or higher` });
    }

    req.membership = membership;
    next();
  };
};

/**
 * Check API key scopes
 * @param {string[]} requiredScopes
 */
export const requireScopes = (...requiredScopes) => {
  return (req, res, next) => {
    if (req.authType !== 'apiKey') {
      return next(); // JWT users bypass scope check
    }

    const userScopes = req.scopes || [];
    const hasScope = requiredScopes.some(scope =>
      userScopes.includes(scope) || userScopes.includes('*')
    );

    if (!hasScope) {
      return res.status(403).json({
        error: 'API key missing required scope',
        required: requiredScopes,
        provided: userScopes,
      });
    }

    next();
  };
};

/**
 * Generate JWT tokens
 * @param {Object} payload
 * @returns {Object} accessToken and refreshToken
 */
export const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 * @param {string} token
 * @returns {Object} decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
