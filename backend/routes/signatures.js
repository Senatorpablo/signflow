/**
 * Signature Routes
 * Signing flow - sign, complete, decline
 */

import { Router } from 'express';
import { prisma } from '../config/database.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { createSignedPDF } from '../services/pdfService.js';
import { emailService } from '../services/emailService.js';

const router = Router();

// Sign a field
router.post('/sign/:token', catchAsync(async (req, res) => {
  const { fieldId, signatureData, type } = req.body;

  // Find document by token
  const document = await prisma.document.findFirst({
    where: { id: req.params.token },
    include: { fields: true },
  });

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  // Find field
  const field = document.fields.find(f => f.id === fieldId);
  if (!field) {
    throw new ApiError(404, 'Field not found');
  }

  // Create signature
  const signature = await prisma.signature.create({
    data: {
      fieldId: field.id,
      documentId: document.id,
      signerEmail: req.body.email || 'anonymous@signflow.io',
      signerName: req.body.name || 'Anonymous',
      type: type || 'DRAWN',
      signatureData,
      signedAt: new Date(),
    },
  });

  // Update field value
  await prisma.field.update({
    where: { id: fieldId },
    data: { value: signatureData },
  });

  res.json(signature);
}));

// Complete signing
router.post('/complete/:token', catchAsync(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.token },
    include: { fields: true, signatures: true },
  });

  if (!document) {
    throw new ApiError(404, 'Document not found');
  }

  // Check all required fields are signed
  const unsignedFields = document.fields.filter(f => f.required && !f.value);
  if (unsignedFields.length > 0) {
    throw new ApiError(400, 'Not all required fields are signed');
  }

  // Generate signed PDF
  const originalPath = `./uploads/${document.storageKey}`;

  // Use first signature for embedding
  const firstSignature = document.signatures[0];
  if (firstSignature) {
    await createSignedPDF(originalPath, firstSignature.signatureData, {});
  }

  // Update document status
  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Send completion emails
  if (document.recipients?.length > 0) {
    for (const recipient of document.recipients) {
      await emailService.sendCompleted({
        to: recipient.email,
        name: recipient.name,
        documentName: document.title,
        downloadUrl: `${process.env.FRONTEND_URL}/documents/${document.id}/download`,
      }).catch(() => {});
    }
  }

  res.json(updated);
}));

export default router;
