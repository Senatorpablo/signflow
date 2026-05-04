/**
 * Document Routes
 * CRUD, upload, send, void, and manage documents
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../config/database.js';
import { authenticate, requireScopes } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { logAudit } from '../services/auditService.js';
import { saveFile, deleteFile, getFileUrl } from '../utils/storage.js';
import { processPdf } from '../services/pdfService.js';
import { sendEmail } from '../services/emailService.js';
import { triggerWebhooks } from '../services/webhookService.js';

const router = Router();

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Invalid file type. Only PDF, DOC, DOCX, PNG, and JPEG are allowed.'), false);
    }
  },
});

// ==========================================
// LIST DOCUMENTS
// ==========================================

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: List documents
 *     tags: [Documents]
 *     parameters:
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [DRAFT, PENDING, SENT, PARTIALLY_SIGNED, COMPLETED, VOIDED] }
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of documents }
 */
router.get(
  '/',
  authenticate,
  requireScopes('read:documents'),
  [
    query('status').optional().isIn(['DRAFT', 'PENDING', 'SENT', 'PARTIALLY_SIGNED', 'COMPLETED', 'VOIDED', 'EXPIRED']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('organizationId').optional().isUUID(),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const organizationId = req.query.organizationId;

    // Build where clause
    const where = {
      OR: [
        { ownerId: req.user.id },
        ...(organizationId ? [{ organizationId }] : []),
        {
          recipients: {
            path: ['$[*].email'],
            array_contains: req.user.email,
          },
        },
      ],
    };

    if (status) {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
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
              assignedTo: true,
              required: true,
            },
          },
          signatures: {
            select: {
              id: true,
              signerEmail: true,
              signerName: true,
              signedAt: true,
              type: true,
            },
          },
          _count: {
            select: {
              fields: true,
              signatures: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data: documents,
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
// UPLOAD DOCUMENT
// ==========================================

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Document created }
 */
router.post(
  '/',
  authenticate,
  requireScopes('write:documents'),
  uploadLimiter,
  upload.single('file'),
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('organizationId').optional().isUUID(),
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const { title, description, organizationId } = req.body;
    const file = req.file;

    // Check subscription limits
    const subscription = req.user.subscriptions?.[0];
    const docCount = await prisma.document.count({
      where: {
        ownerId: req.user.id,
        createdAt: { gte: new Date(new Date().setDate(1)) }, // This month
      },
    });

    if (subscription?.tier === 'FREE' && docCount >= subscription.documentsPerMonth) {
      throw new ApiError(403, 'Document limit reached for free tier. Upgrade to create more documents.');
    }

    // Generate storage key
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const storageKey = `documents/${req.user.id}/${fileId}${ext}`;

    // Save file
    await saveFile(storageKey, file.buffer, file.mimetype);

    // Process PDF (extract pages, get metadata)
    let pageCount = 1;
    let pdfInfo = {};

    if (file.mimetype === 'application/pdf') {
      try {
        const processed = await processPdf(file.buffer);
        pageCount = processed.pageCount || 1;
        pdfInfo = processed.info || {};
      } catch (err) {
        console.warn('PDF processing failed:', err.message);
      }
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: title || file.originalname.replace(ext, ''),
        description,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        storageType: process.env.STORAGE_TYPE || 'local',
        storageKey,
        status: 'DRAFT',
        ownerId: req.user.id,
        organizationId: organizationId || null,
        recipients: [],
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Log audit
    await logAudit({
      action: 'DOCUMENT_CREATED',
      userId: req.user.id,
      documentId: document.id,
      metadata: {
        title: document.title,
        fileName: document.fileName,
        fileSize: document.fileSize,
        pageCount,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: {
        ...document,
        pageCount,
        pdfInfo,
      },
    });
  })
);

// ==========================================
// GET SINGLE DOCUMENT
// ==========================================

router.get(
  '/:id',
  authenticate,
  requireScopes('read:documents'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
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
        signatures: {
          include: {
            field: {
              select: { type: true, label: true, page: true },
            },
          },
          orderBy: { signedAt: 'asc' },
        },
        template: {
          select: { id: true, name: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check access permissions
    const hasAccess =
      document.ownerId === req.user.id ||
      (document.organizationId && req.user.memberships?.some(m => m.organizationId === document.organizationId)) ||
      document.recipients?.some(r => r.email === req.user.email);

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }

    // Get file URL
    const fileUrl = await getFileUrl(document.storageKey);

    res.json({
      success: true,
      data: {
        ...document,
        fileUrl,
      },
    });
  })
);

// ==========================================
// UPDATE DOCUMENT
// ==========================================

router.patch(
  '/:id',
  authenticate,
  requireScopes('write:documents'),
  [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('emailSubject').optional().trim().isLength({ max: 200 }),
    body('emailMessage').optional().trim().isLength({ max: 5000 }),
    body('expiresAt').optional().isISO8601(),
    body('signingOrder').optional().isBoolean(),
    body('requireAllSignatures').optional().isBoolean(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (document.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the document owner can update it');
    }

    if (document.status !== 'DRAFT') {
      throw new ApiError(400, 'Only draft documents can be updated');
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.emailSubject && { emailSubject: updates.emailSubject }),
        ...(updates.emailMessage && { emailMessage: updates.emailMessage }),
        ...(updates.expiresAt && { expiresAt: new Date(updates.expiresAt) }),
        ...(updates.signingOrder !== undefined && { signingOrder: updates.signingOrder }),
        ...(updates.requireAllSignatures !== undefined && { requireAllSignatures: updates.requireAllSignatures }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        fields: true,
      },
    });

    await logAudit({
      action: 'DOCUMENT_UPDATED',
      userId: req.user.id,
      documentId: id,
      metadata: { updates: Object.keys(updates) },
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
// DELETE DOCUMENT
// ==========================================

router.delete(
  '/:id',
  authenticate,
  requireScopes('write:documents'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { signatures: true },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (document.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the document owner can delete it');
    }

    if (document.signatures.length > 0) {
      throw new ApiError(400, 'Cannot delete a document that has signatures. Void it instead.');
    }

    // Delete file from storage
    await deleteFile(document.storageKey).catch(() => {});

    // Delete record
    await prisma.document.delete({ where: { id } });

    await logAudit({
      action: 'DOCUMENT_DELETED',
      userId: req.user.id,
      documentId: id,
      metadata: { title: document.title },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  })
);

// ==========================================
// SEND DOCUMENT (add recipients and send)
// ==========================================

router.post(
  '/:id/send',
  authenticate,
  requireScopes('write:documents'),
  [
    param('id').isUUID(),
    body('recipients').isArray({ min: 1, max: 50 }),
    body('recipients.*.email').isEmail().normalizeEmail(),
    body('recipients.*.name').optional().trim().isLength({ max: 100 }),
    body('recipients.*.role').optional().isIn(['SIGNER', 'VIEWER', 'CC']),
    body('emailSubject').optional().trim(),
    body('emailMessage').optional().trim(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { recipients, emailSubject, emailMessage } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        fields: true,
        owner: true,
      },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (document.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the document owner can send it');
    }

    if (document.status !== 'DRAFT') {
      throw new ApiError(400, `Document is already ${document.status.toLowerCase()}`);
    }

    // Check signer limits
    const signerCount = recipients.filter(r => r.role === 'SIGNER' || !r.role).length;
    const subscription = req.user.subscriptions?.[0];
    if (subscription?.tier === 'FREE' && signerCount > subscription.signersPerDocument) {
      throw new ApiError(403, `Free tier limited to ${subscription.signersPerDocument} signers per document`);
    }

    // Process recipients
    const processedRecipients = recipients.map((r, index) => ({
      email: r.email,
      name: r.name || r.email.split('@')[0],
      role: r.role || 'SIGNER',
      status: 'PENDING',
      order: r.order || index + 1,
    }));

    // Update document
    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: 'SENT',
        recipients: processedRecipients,
        emailSubject: emailSubject || `Please sign: ${document.title}`,
        emailMessage: emailMessage || null,
      },
      include: {
        fields: true,
      },
    });

    // Send emails to recipients
    const sendPromises = processedRecipients
      .filter(r => r.role === 'SIGNER')
      .map(async (recipient) => {
        try {
          await sendEmail({
            to: recipient.email,
            subject: updated.emailSubject,
            template: 'signature-request',
            data: {
              documentTitle: document.title,
              senderName: document.owner.name || document.owner.email,
              recipientName: recipient.name,
              message: emailMessage,
              signUrl: `${process.env.FRONTEND_URL}/sign/${id}?email=${encodeURIComponent(recipient.email)}`,
            },
          });
        } catch (err) {
          console.error(`Failed to send email to ${recipient.email}:`, err.message);
        }
      });

    await Promise.all(sendPromises);

    // Trigger webhooks
    await triggerWebhooks(req.user.id, 'DOCUMENT_SENT', {
      documentId: id,
      title: document.title,
      recipientCount: processedRecipients.length,
      sentAt: new Date().toISOString(),
    });

    // Log audit
    await logAudit({
      action: 'DOCUMENT_SENT',
      userId: req.user.id,
      documentId: id,
      metadata: {
        recipients: processedRecipients.map(r => ({ email: r.email, role: r.role })),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: updated,
      message: `Document sent to ${processedRecipients.length} recipient(s)`,
    });
  })
);

// ==========================================
// VOID DOCUMENT
// ==========================================

router.post(
  '/:id/void',
  authenticate,
  requireScopes('write:documents'),
  [
    param('id').isUUID(),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: true, signatures: true },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (document.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the document owner can void it');
    }

    if (['VOIDED', 'COMPLETED', 'DECLINED', 'EXPIRED'].includes(document.status)) {
      throw new ApiError(400, `Document is already ${document.status.toLowerCase()}`);
    }

    const updated = await prisma.document.update({
      where: { id },
      data: { status: 'VOIDED' },
    });

    // Notify signers
    const signerRecipients = document.recipients?.filter(r => r.role === 'SIGNER' && r.status === 'PENDING') || [];
    await Promise.all(
      signerRecipients.map(async (recipient) => {
        try {
          await sendEmail({
            to: recipient.email,
            subject: `Document voided: ${document.title}`,
            template: 'document-voided',
            data: {
              documentTitle: document.title,
              senderName: document.owner.name || document.owner.email,
              reason,
            },
          });
        } catch (err) {
          console.error(`Failed to notify ${recipient.email}:`, err.message);
        }
      })
    );

    await triggerWebhooks(req.user.id, 'DOCUMENT_VOIDED', {
      documentId: id,
      title: document.title,
      reason,
      voidedAt: new Date().toISOString(),
    });

    await logAudit({
      action: 'DOCUMENT_VOIDED',
      userId: req.user.id,
      documentId: id,
      metadata: { reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: updated,
      message: 'Document voided successfully',
    });
  })
);

// ==========================================
// GET DOCUMENT FILE
// ==========================================

router.get(
  '/:id/download',
  authenticate,
  requireScopes('read:documents'),
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    // Check access
    const hasAccess =
      document.ownerId === req.user.id ||
      document.recipients?.some(r => r.email === req.user.email);

    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }

    // Get file
    const { buffer, contentType } = await getFileUrl(document.storageKey, true);

    res.setHeader('Content-Type', contentType || document.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.send(buffer);
  })
);

// ==========================================
// ADD FIELDS TO DOCUMENT
// ==========================================

router.post(
  '/:id/fields',
  authenticate,
  requireScopes('write:documents'),
  [
    param('id').isUUID(),
    body('fields').isArray({ min: 1 }),
    body('fields.*.type').isIn(['SIGNATURE', 'INITIALS', 'DATE', 'TEXT', 'CHECKBOX', 'RADIO', 'DROPDOWN', 'EMAIL', 'NAME', 'COMPANY', 'TITLE', 'STAMP', 'ATTACHMENT']),
    body('fields.*.page').isInt({ min: 1 }),
    body('fields.*.x').isFloat(),
    body('fields.*.y').isFloat(),
    body('fields.*.width').optional().isFloat(),
    body('fields.*.height').optional().isFloat(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { fields } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (document.ownerId !== req.user.id) {
      throw new ApiError(403, 'Only the document owner can add fields');
    }

    if (document.status !== 'DRAFT') {
      throw new ApiError(400, 'Fields can only be added to draft documents');
    }

    // Delete existing fields if any
    await prisma.field.deleteMany({
      where: { documentId: id },
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
            documentId: id,
            order: field.order || index,
            options: field.options || null,
            defaultValue: field.defaultValue || null,
          },
        })
      )
    );

    await logAudit({
      action: 'FIELD_CREATED',
      userId: req.user.id,
      documentId: id,
      metadata: { fieldCount: fields.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      data: createdFields,
    });
  })
);

export default router;
