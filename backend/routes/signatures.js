/**
 * Signature Routes
 * Signing flow, signature creation, and verification
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { logAudit } from '../services/auditService.js';
import { triggerWebhooks } from '../services/webhookService.js';
import { sendEmail } from '../services/emailService.js';
import { saveFile, getFileUrl } from '../utils/storage.js';

const router = Router();

// ==========================================
// GET SIGNING LINK / VIEW DOCUMENT FOR SIGNING
// ==========================================

/**
 * @swagger
 * /api/signatures/document/{id}:
 *   get:
 *     summary: Get document for signing (public or auth)
 *     tags: [Signatures]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: email
 *         in: query
 *         schema: { type: string, format: email }
 *     responses:
 *       200: { description: Document with fields for signing }
 */
router.get(
  '/document/:id',
  optionalAuth,
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { email } = req.query;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        fields: {
          where: {
            OR: [
              { type: { in: ['SIGNATURE', 'INITIALS', 'DATE', 'TEXT', 'CHECKBOX', 'NAME', 'COMPANY', 'TITLE', 'EMAIL'] } },
            ],
          },
          orderBy: { order: 'asc' },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        signatures: {
          include: {
            field: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (['VOIDED', 'DECLINED', 'EXPIRED'].includes(document.status)) {
      throw new ApiError(400, `This document has been ${document.status.toLowerCase()}`);
    }

    // Determine if user can sign
    let canSign = false;
    let assignedFields = [];

    const signerEmail = req.user?.email || email;

    if (signerEmail) {
      const recipient = document.recipients?.find(r => r.email.toLowerCase() === signerEmail.toLowerCase());

      if (recipient && recipient.status !== 'SIGNED') {
        canSign = true;
        assignedFields = document.fields.filter(
          f => !f.assignedTo || f.assignedTo.toLowerCase() === signerEmail.toLowerCase()
        );
      }
    }

    // Get file URL
    const fileUrl = await getFileUrl(document.storageKey);

    // Log view
    await prisma.documentView.create({
      data: {
        documentId: id,
        viewerEmail: signerEmail || null,
        viewerIp: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        description: document.description,
        status: document.status,
        fileUrl,
        fileName: document.fileName,
        owner: document.owner,
        recipients: document.recipients,
        fields: assignedFields.length > 0 ? assignedFields : document.fields,
        signatures: document.signatures,
        canSign,
        signerEmail: signerEmail || null,
        signingOrder: document.signingOrder,
        emailSubject: document.emailSubject,
        emailMessage: document.emailMessage,
      },
    });
  })
);

// ==========================================
// SUBMIT SIGNATURES
// ==========================================

/**
 * @swagger
 * /api/signatures/document/{id}/sign:
 *   post:
 *     summary: Submit signatures for a document
 *     tags: [Signatures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, fields]
 *             properties:
 *               email: { type: string }
 *               fields: { type: array }
 *     responses:
 *       200: { description: Signatures saved }
 */
router.post(
  '/document/:id/sign',
  optionalAuth,
  [
    param('id').isUUID(),
    body('email').isEmail().normalizeEmail(),
    body('fields').isArray({ min: 1 }),
    body('fields.*.fieldId').isUUID(),
    body('fields.*.value').notEmpty(),
    body('name').optional().trim(),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { email, name, fields: submittedFields } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        fields: {
          include: {
            signature: true,
          },
        },
        signatures: true,
        owner: true,
      },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (['VOIDED', 'DECLINED', 'EXPIRED', 'COMPLETED'].includes(document.status)) {
      throw new ApiError(400, `This document is ${document.status.toLowerCase()}`);
    }

    // Find recipient
    const recipientIndex = document.recipients?.findIndex(
      r => r.email.toLowerCase() === email.toLowerCase()
    );

    if (recipientIndex === -1) {
      throw new ApiError(403, 'You are not a recipient of this document');
    }

    const recipient = document.recipients[recipientIndex];

    if (recipient.status === 'SIGNED') {
      throw new ApiError(400, 'You have already signed this document');
    }

    // Check signing order
    if (document.signingOrder) {
      const currentOrder = recipient.order;
      const pendingBefore = document.recipients.filter(
        r => r.order < currentOrder && r.role === 'SIGNER' && r.status !== 'SIGNED'
      );
      if (pendingBefore.length > 0) {
        throw new ApiError(400, 'Please wait for earlier signers to complete');
      }
    }

    // Validate submitted fields
    for (const submitted of submittedFields) {
      const field = document.fields.find(f => f.id === submitted.fieldId);
      if (!field) {
        throw new ApiError(400, `Field ${submitted.fieldId} not found`);
      }
      if (field.signature) {
        throw new ApiError(400, `Field ${field.label || field.id} has already been signed`);
      }
      if (field.assignedTo && field.assignedTo.toLowerCase() !== email.toLowerCase()) {
        throw new ApiError(403, `Field ${field.label || field.id} is assigned to another signer`);
      }
    }

    // Get PDF and add signatures
    let signedPdfBuffer;
    try {
      const fileBuffer = await getFileUrl(document.storageKey, true);
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();

      for (const submitted of submittedFields) {
        const field = document.fields.find(f => f.id === submitted.fieldId);
        const page = pages[field.page - 1] || pages[0];
        const { width, height } = page.getSize();

        // Convert percentage to absolute coordinates
        const x = (field.x / 100) * width;
        const y = height - ((field.y / 100) * height);

        if (field.type === 'SIGNATURE' || field.type === 'INITIALS') {
          // Handle signature image
          const signatureData = submitted.value;
          if (signatureData.startsWith('data:image')) {
            const base64Data = signatureData.split(',')[1];
            const imageBytes = Buffer.from(base64Data, 'base64');
            const image = await pdfDoc.embedPng(imageBytes);
            page.drawImage(image, {
              x,
              y: y - (field.height / 100) * height,
              width: (field.width / 100) * width,
              height: (field.height / 100) * height,
            });
          }
        } else {
          // Draw text for other field types
          page.drawText(submitted.value, {
            x,
            y: y - 12,
            size: 12,
          });
        }
      }

      signedPdfBuffer = await pdfDoc.save();
    } catch (err) {
      console.error('PDF signing error:', err);
      // Continue without embedding - just record signatures
      signedPdfBuffer = null;
    }

    // Save signed PDF if available
    let newStorageKey = document.storageKey;
    if (signedPdfBuffer) {
      newStorageKey = `documents/${document.ownerId}/signed-${uuidv4()}.pdf`;
      await saveFile(newStorageKey, signedPdfBuffer, 'application/pdf');
    }

    // Create signature records
    const userId = req.user?.id || null;

    await prisma.$transaction(
      submittedFields.map((submitted) =>
        prisma.signature.create({
          data: {
            fieldId: submitted.fieldId,
            documentId: id,
            signerId: userId,
            signerEmail: email,
            signerName: name || email.split('@')[0],
            signerIp: req.ip,
            signerUserAgent: req.headers['user-agent'],
            type: 'DRAWN',
            signatureData: submitted.value,
            signedAt: new Date(),
            verified: true,
          },
        })
      )
    );

    // Update document with new storage key
    await prisma.document.update({
      where: { id },
      data: {
        storageKey: newStorageKey,
      },
    });

    // Update recipient status
    const updatedRecipients = [...document.recipients];
    updatedRecipients[recipientIndex] = {
      ...recipient,
      status: 'SIGNED',
      signedAt: new Date().toISOString(),
    };

    // Check if all signers have signed
    const allSigners = updatedRecipients.filter(r => r.role === 'SIGNER');
    const allSigned = allSigners.every(r => r.status === 'SIGNED');

    let newStatus = document.status;
    if (allSigned && document.status !== 'COMPLETED') {
      newStatus = 'COMPLETED';
    } else if (document.status === 'SENT') {
      newStatus = 'PARTIALLY_SIGNED';
    }

    await prisma.document.update({
      where: { id },
      data: {
        recipients: updatedRecipients,
        status: newStatus,
        completedAt: allSigned ? new Date() : null,
      },
    });

    // Send completion email if done
    if (allSigned) {
      await sendEmail({
        to: document.owner.email,
        subject: `Document completed: ${document.title}`,
        template: 'document-completed',
        data: {
          documentTitle: document.title,
          signerCount: allSigners.length,
          viewUrl: `${process.env.FRONTEND_URL}/documents/${id}`,
        },
      }).catch(() => {});

      await triggerWebhooks(document.ownerId, 'DOCUMENT_COMPLETED', {
        documentId: id,
        title: document.title,
        completedAt: new Date().toISOString(),
        signerCount: allSigners.length,
      });
    } else {
      // Notify next signer if sequential
      if (document.signingOrder) {
        const nextSigner = updatedRecipients.find(
          r => r.role === 'SIGNER' && r.status === 'PENDING'
        );
        if (nextSigner) {
          await sendEmail({
            to: nextSigner.email,
            subject: document.emailSubject || `Please sign: ${document.title}`,
            template: 'signature-request',
            data: {
              documentTitle: document.title,
              senderName: document.owner.name || document.owner.email,
              recipientName: nextSigner.name,
              signUrl: `${process.env.FRONTEND_URL}/sign/${id}?email=${encodeURIComponent(nextSigner.email)}`,
            },
          }).catch(() => {});
        }
      }
    }

    // Trigger webhook
    await triggerWebhooks(document.ownerId, 'DOCUMENT_SIGNED', {
      documentId: id,
      title: document.title,
      signerEmail: email,
      signedAt: new Date().toISOString(),
      allSigned,
    });

    // Log audit
    await logAudit({
      action: 'DOCUMENT_SIGNED',
      userId: userId || null,
      documentId: id,
      metadata: {
        signerEmail: email,
        fieldCount: submittedFields.length,
        allSigned,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        documentId: id,
        status: newStatus,
        allSigned,
        message: allSigned
          ? 'Document fully signed and completed!'
          : 'Signature submitted successfully',
      },
    });
  })
);

// ==========================================
// DECLINE TO SIGN
// ==========================================

router.post(
  '/document/:id/decline',
  optionalAuth,
  [
    param('id').isUUID(),
    body('email').isEmail().normalizeEmail(),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { email, reason } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!document) {
      throw new ApiError(404, 'Document not found');
    }

    if (!['SENT', 'PENDING', 'PARTIALLY_SIGNED'].includes(document.status)) {
      throw new ApiError(400, `Document is already ${document.status.toLowerCase()}`);
    }

    const recipientIndex = document.recipients?.findIndex(
      r => r.email.toLowerCase() === email.toLowerCase()
    );

    if (recipientIndex === -1) {
      throw new ApiError(403, 'You are not a recipient of this document');
    }

    const updatedRecipients = [...document.recipients];
    updatedRecipients[recipientIndex] = {
      ...updatedRecipients[recipientIndex],
      status: 'DECLINED',
      declinedAt: new Date().toISOString(),
      declineReason: reason || null,
    };

    await prisma.document.update({
      where: { id },
      data: {
        status: 'DECLINED',
        recipients: updatedRecipients,
      },
    });

    // Notify owner
    await sendEmail({
      to: document.owner.email,
      subject: `Document declined: ${document.title}`,
      template: 'document-declined',
      data: {
        documentTitle: document.title,
        signerEmail: email,
        reason,
      },
    }).catch(() => {});

    await triggerWebhooks(document.ownerId, 'DOCUMENT_DECLINED', {
      documentId: id,
      title: document.title,
      signerEmail: email,
      reason,
      declinedAt: new Date().toISOString(),
    });

    await logAudit({
      action: 'DOCUMENT_DECLINED',
      userId: req.user?.id || null,
      documentId: id,
      metadata: { signerEmail: email, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Document declined',
    });
  })
);

// ==========================================
// GET SIGNATURE DETAILS
// ==========================================

router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const signature = await prisma.signature.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            ownerId: true,
          },
        },
        field: true,
        signer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!signature) {
      throw new ApiError(404, 'Signature not found');
    }

    // Check access
    if (signature.document.ownerId !== req.user.id && signature.signerId !== req.user.id) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: signature,
    });
  })
);

export default router;
