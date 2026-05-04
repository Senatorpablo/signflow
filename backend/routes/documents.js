/**
 * Document Routes with Authentication
 * Upload, manage, and send documents for signing
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Simple auth middleware
const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = auth.slice(7);
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'test-secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Create document (upload)
router.post('/', authenticate, upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const doc = await prisma.document.create({
    data: {
      title: req.body.title || req.file.originalname,
      fileName: req.file.filename,
      fileSize: req.file.size,
      fileType: 'application/pdf',
      storageKey: req.file.filename,
      status: 'DRAFT',
      recipients: [],
      ownerId: req.userId,
    },
  });

  res.status(201).json(doc);
}));

// List documents
router.get('/', authenticate, catchAsync(async (req, res) => {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fields: true,
      signatures: true,
    },
  });
  res.json(docs);
}));

// Get document by ID
router.get('/:id', authenticate, catchAsync(async (req, res) => {
  const doc = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: { fields: true, signatures: true },
  });

  if (!doc) {
    throw new ApiError(404, 'Document not found');
  }

  res.json(doc);
}));

// Update document fields
router.patch('/:id/fields', authenticate, catchAsync(async (req, res) => {
  const { fields } = req.body;

  await prisma.field.deleteMany({
    where: { documentId: req.params.id },
  });

  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      fields: {
        create: fields.map(f => ({
          type: f.type,
          label: f.label,
          page: f.page || 1,
          x: f.x,
          y: f.y,
          width: f.width || 150,
          height: f.height || 30,
          required: f.required ?? true,
          order: f.order || 0,
        })),
      },
    },
    include: { fields: true },
  });

  res.json(doc);
}));

// Send document
router.post('/:id/send', authenticate, catchAsync(async (req, res) => {
  const { signers, message } = req.body;

  const doc = await prisma.document.update({
    where: { id: req.params.id },
    data: {
      status: 'SENT',
      recipients: signers || [],
      emailMessage: message,
    },
  });

  res.json(doc);
}));

// Delete document
router.delete('/:id', authenticate, catchAsync(async (req, res) => {
  const doc = await prisma.document.findUnique({
    where: { id: req.params.id },
  });

  if (!doc) {
    throw new ApiError(404, 'Document not found');
  }

  try {
    fs.unlinkSync(`./uploads/${doc.storageKey}`);
  } catch (e) {}

  await prisma.document.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true });
}));

export default router;
