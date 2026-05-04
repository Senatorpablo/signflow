/**
 * Template Routes
 * Template management, creation from documents, and marketplace
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { prisma } from '../config/database.js';
import { authenticate, requireScopes } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { logAudit } from '../services/auditService.js';
import { saveFile, deleteFile, getFileUrl } from '../utils/storage.js';

const router = Router();

// ==========================================
// LIST TEMPLATES
// ==========================================

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: List templates
 *     tags: [Templates]
 *     parameters:
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: isPublic
 *         in: query
 *         schema: { type: boolean }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of templates }
 */
router.get(
  '/',
  authenticate,
  requireScopes('read:templates'),
  [
    query('category').optional().trim(),
    query('isPublic').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('organizationId').optional().isUUID(),
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
      OR: [
        { ownerId: req.user.id },
        { isPublic: true },
        ...(req.query.organizationId
          ? [{ organizationId: req.query.organizationId }]
          : []),
      ],
    };

    if (req.query.category) {
      where.category = req.query.category;
    }

    if (req.query.isPublic !== undefined) {
      where.isPublic = req.query.isPublic === 'true';
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
          fields: {
            select: {
              id: true,
              type: true,
              label: true,
              page: true,
              x: true,
              y: true,
            },
          },
          _count: {
            select: {
              documents: true,
              fields: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.template.count({ where }),
    ]);

    res.json({
      success: true,
      data: templates,
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
// CREATE TEMPLATE FROM DOCUMENT
// ==========================================

router.post(
  '/',
  authenticate,
  requireScopes('write:templates'),
  [
    body('name').trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('category').optional().trim(),
    body('sourceDocumentId').optional().isUUID(),
    body('organizationId').optional().isUUID(),
    body('isPublic').optional().isBoolean(),
    body('settings').optional().isObject(),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { name, description, category, sourceDocumentId, organizationId, isPublic, settings } = req.body;

    // Check template limits
    const subscription = req.user.subscriptions?.[0];
    const templateCount = await prisma.template.count({
      where: { ownerId: req.user.id },
    });

    if (subscription?.tier === 'FREE' && templateCount >= subscription.templatesLimit) {
      throw new ApiError(403, `Free tier limited to ${subscription.templatesLimit} templates`);
    }

    let storageKey = null;
    let fileName = null;
    let fields = [];

    // If creating from existing document, copy it
    if (sourceDocumentId) {
      const sourceDoc = await prisma.document.findUnique({
        where: { id: sourceDocumentId },
        include: { fields: true },
      });

      if (!sourceDoc) {
        throw new ApiError(404, 'Source document not found');
      }

      if (sourceDoc.ownerId !== req.user.id) {
        throw new ApiError(403, 'You can only create templates from your own documents');
      }

      // Copy file
      const sourceBuffer = await getFileUrl(sourceDoc.storageKey, true);
      storageKey = `templates/${req.user.id}/${crypto.randomUUID()}.pdf`;
      await saveFile(storageKey, sourceBuffer, 'application/pdf');
      fileName = sourceDoc.fileName;

      // Copy fields (without documentId)
      fields = sourceDoc.fields.map(f => ({
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        readOnly: f.readOnly,
        assignedTo: f.assignedTo,
        order: f.order,
        options: f.options,
        defaultValue: f.defaultValue,
      }));
    }

    // Create template
    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        fileName: fileName || `${name}.pdf`,
        storageType: process.env.STORAGE_TYPE || 'local',
        storageKey,
        ownerId: req.user.id,
        organizationId: organizationId || null,
        isPublic: isPublic || false,
        settings: settings || {},
        ...(fields.length > 0 && {
          fields: {
            create: fields,
          },
        }),
      },
      include: {
        fields: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logAudit({
      action: 'TEMPLATE_CREATED',
      userId: req.user.id,
      metadata: {
        templateId: template.id,
        name: template.name,
        sourceDocumentId: sourceDocumentId || null,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  })
);

// ==========================================
// GET SINGLE TEMPLATE
// ==========================================

router.get(
  '/:id',
  authenticate,
  requireScopes('read:templates'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
        fields: {
          orderBy: { order: 'asc' },
        },
        documents: {
          select: { id: true, title: true, status: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    // Check access
    const hasAccess =
      template.ownerId === req.user.id ||
      template.isPublic ||
      (template.organizationId && req.user.memberships?.some(m => m.organizationId === template.organizationId));

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: template,
    });
  })
);

// ==========================================
// UPDATE TEMPLATE
// ==========================================

router.patch(
  '/:id',
  authenticate,
  requireScopes('write:templates'),
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('category').optional().trim(),
    body('isPublic').optional().isBoolean(),
    body('settings').optional().isObject(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the template owner can update it');
    }

    const updated = await prisma.template.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
        ...(updates.settings && { settings: updates.settings }),
      },
      include: {
        fields: true,
      },
    });

    await logAudit({
      action: 'TEMPLATE_UPDATED',
      userId: req.user.id,
      metadata: { templateId: id, updates: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

// ==========================================
// DELETE TEMPLATE
// ==========================================

router.delete(
  '/:id',
  authenticate,
  requireScopes('write:templates'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: { documents: { take: 1 } },
    });

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the template owner can delete it');
    }

    // Delete file from storage
    if (template.storageKey) {
      await deleteFile(template.storageKey).catch(() => {});
    }

    // Delete record
    await prisma.template.delete({ where: { id } });

    await logAudit({
      action: 'TEMPLATE_DELETED',
      userId: req.user.id,
      metadata: { templateId: id, name: template.name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

// ==========================================
// USE TEMPLATE (create document from template)
// ==========================================

router.post(
  '/:id/use',
  authenticate,
  requireScopes('write:documents'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        fields: true,
      },
    });

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    // Check access
    const hasAccess =
      template.ownerId === req.user.id ||
      template.isPublic ||
      (template.organizationId && req.user.memberships?.some(m => m.organizationId === template.organizationId));

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }

    // Copy template file
    const sourceBuffer = await getFileUrl(template.storageKey, true);
    const storageKey = `documents/${req.user.id}/${crypto.randomUUID()}.pdf`;
    await saveFile(storageKey, sourceBuffer, 'application/pdf');

    // Create document with copied fields
    const document = await prisma.document.create({
      data: {
        title: `${template.name} - Copy`,
        description: `Created from template: ${template.name}`,
        fileName: template.fileName,
        fileSize: sourceBuffer.length,
        fileType: 'application/pdf',
        storageType: process.env.STORAGE_TYPE || 'local',
        storageKey,
        status: 'DRAFT',
        ownerId: req.user.id,
        templateId: template.id,
        recipients: [],
        ipAddress: req.ip,
        fields: {
          create: template.fields.map(f => ({
            type: f.type,
            label: f.label,
            placeholder: f.placeholder,
            page: f.page,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            required: f.required,
            readOnly: f.readOnly,
            assignedTo: f.assignedTo,
            order: f.order,
            options: f.options,
            defaultValue: f.defaultValue,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    // Update template usage count
    await prisma.template.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    await logAudit({
      action: 'TEMPLATE_USED',
      userId: req.user.id,
      documentId: document.id,
      metadata: {
        templateId: template.id,
        templateName: template.name,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document created from template',
    });
  })
);

// ==========================================
// UPDATE TEMPLATE FIELDS
// ==========================================

router.patch(
  '/:id/fields',
  authenticate,
  requireScopes('write:templates'),
  [
    param('id').isUUID(),
    body('fields').isArray(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { fields } = req.body;

    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the template owner can update fields');
    }

    // Delete existing fields
    await prisma.field.deleteMany({
      where: { templateId: id },
    });

    // Create new fields
    const createdFields = await prisma.$transaction(
      fields.map((field, index) =>
        prisma.field.create({
          data: {
            type: field.type,
            label: field.label || null,
            placeholder: field.placeholder || null,
            page: field.page,
            x: field.x,
            y: field.y,
            width: field.width || 150,
            height: field.height || 30,
            required: field.required !== false,
            readOnly: field.readOnly || false,
            assignedTo: field.assignedTo || null,
            templateId: id,
            order: field.order || index,
            options: field.options || null,
            defaultValue: field.defaultValue || null,
          },
        })
      )
    );

    res.json({
      success: true,
      data: createdFields,
    });
  })
);

export default router;
