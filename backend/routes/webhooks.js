/**
 * Webhook Routes
 * Webhook CRUD, testing, and delivery logs
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import crypto from 'crypto';

import { prisma } from '../config/database.js';
import { authenticate, requireScopes } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { triggerWebhooks, verifyWebhookSignature } from '../services/webhookService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

const VALID_WEBHOOK_EVENTS = [
  'DOCUMENT_CREATED',
  'DOCUMENT_SENT',
  'DOCUMENT_SIGNED',
  'DOCUMENT_COMPLETED',
  'DOCUMENT_VOIDED',
  'DOCUMENT_DECLINED',
  'DOCUMENT_EXPIRED',
  'SIGNATURE_CREATED',
  'USER_REGISTERED',
  'USER_UPDATED',
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_CANCELED',
];

// ==========================================
// LIST WEBHOOKS
// ==========================================

router.get(
  '/',
  authenticate,
  requireScopes('read:webhooks'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'FAILED']),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
      ownerId: req.user.id,
      ...(req.query.status && { status: req.query.status }),
    };

    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webhook.count({ where }),
    ]);

    res.json({
      success: true,
      data: webhooks.map((w) => ({
        ...w,
        secret: undefined, // Don't expose secrets
      })),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// ==========================================
// CREATE WEBHOOK
// ==========================================

router.post(
  '/',
  authenticate,
  requireScopes('write:webhooks'),
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('url').isURL({ protocols: ['https'] }),
    body('events').isArray({ min: 1 }).custom((events) => {
      return events.every((e) => VALID_WEBHOOK_EVENTS.includes(e));
    }),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }).toInt(),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    // Check subscription - webhooks only for paid tiers
    const subscription = req.user.subscriptions?.[0];
    if (subscription?.tier === 'FREE' && !subscription?.webhooksEnabled) {
      throw new ApiError(403, 'Webhooks require a paid subscription');
    }

    const { name, url, events, maxRetries, organizationId } = req.body;

    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url,
        secret,
        events,
        maxRetries: maxRetries || 5,
        ownerId: req.user.id,
        organizationId: organizationId || null,
      },
    });

    await logAudit({
      action: 'WEBHOOK_CREATED',
      userId: req.user.id,
      metadata: {
        webhookId: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: {
        ...webhook,
        secret: undefined,
      },
    });
  })
);

// ==========================================
// GET SINGLE WEBHOOK
// ==========================================

router.get(
  '/:id',
  authenticate,
  requireScopes('read:webhooks'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    res.json({
      success: true,
      data: {
        ...webhook,
        secret: undefined,
      },
    });
  })
);

// ==========================================
// UPDATE WEBHOOK
// ==========================================

router.patch(
  '/:id',
  authenticate,
  requireScopes('write:webhooks'),
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('url').optional().isURL({ protocols: ['https'] }),
    body('events').optional().isArray().custom((events) => {
      return events.every((e) => VALID_WEBHOOK_EVENTS.includes(e));
    }),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }).toInt(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.url) updates.url = req.body.url;
    if (req.body.events) updates.events = req.body.events;
    if (req.body.status) {
      updates.status = req.body.status;
      if (req.body.status === 'ACTIVE') {
        updates.failureCount = 0;
        updates.lastFailureAt = null;
      }
    }
    if (req.body.maxRetries !== undefined) updates.maxRetries = req.body.maxRetries;

    const updated = await prisma.webhook.update({
      where: { id },
      data: updates,
    });

    await logAudit({
      action: 'SETTINGS_UPDATED',
      userId: req.user.id,
      metadata: {
        webhookId: id,
        updates: Object.keys(updates),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        ...updated,
        secret: undefined,
      },
    });
  })
);

// ==========================================
// DELETE WEBHOOK
// ==========================================

router.delete(
  '/:id',
  authenticate,
  requireScopes('write:webhooks'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    await prisma.webhook.delete({ where: { id } });

    await logAudit({
      action: 'SETTINGS_UPDATED',
      userId: req.user.id,
      metadata: { webhookId: id, action: 'deleted' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  })
);

// ==========================================
// TEST WEBHOOK
// ==========================================

router.post(
  '/:id/test',
  authenticate,
  requireScopes('write:webhooks'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    const testPayload = {
      event: 'TEST',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
      },
    };

    try {
      await triggerWebhooks(req.user.id, 'TEST', testPayload.data);

      res.json({
        success: true,
        message: 'Test webhook sent successfully',
      });
    } catch (error) {
      throw new ApiError(400, 'Webhook test failed', { error: error.message });
    }
  })
);

// ==========================================
// GET WEBHOOK DELIVERY LOGS
// ==========================================

router.get(
  '/:id/deliveries',
  authenticate,
  requireScopes('read:webhooks'),
  [
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { attemptedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webhookDelivery.count({ where: { webhookId: id } }),
    ]);

    res.json({
      success: true,
      data: deliveries,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// ==========================================
// REGENERATE WEBHOOK SECRET
// ==========================================

router.post(
  '/:id/rotate-secret',
  authenticate,
  requireScopes('write:webhooks'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook || webhook.ownerId !== req.user.id) {
      throw new ApiError(404, 'Webhook not found');
    }

    const newSecret = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });

    res.json({
      success: true,
      data: {
        message: 'Secret rotated successfully. Update your webhook consumer immediately.',
        newSecret, // Only returned once
      },
    });
  })
);

export default router;
