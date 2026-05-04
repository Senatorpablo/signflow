/**
 * Document Routes
 * Upload, manage, and send documents for signing
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// In-memory store for testing
const documents = [];

// Create document (upload)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const document = {
      id: crypto.randomUUID(),
      title: req.body.title || req.file.originalname,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      status: 'DRAFT',
      fields: [],
      signatures: [],
      recipients: [],
      createdAt: new Date(),
    };

    documents.push(document);

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List documents
router.get('/', (req, res) => {
  res.json(documents);
});

// Get document by ID
router.get('/:id', (req, res) => {
  const document = documents.find(d => d.id === req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(document);
});

// Update document fields
router.patch('/:id/fields', (req, res) => {
  const document = documents.find(d => d.id === req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  document.fields = req.body.fields || [];
  res.json(document);
});

// Send document
router.post('/:id/send', (req, res) => {
  const document = documents.find(d => d.id === req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  document.recipients = req.body.signers || [];
  document.status = 'SENT';
  document.sentAt = new Date();

  res.json(document);
});

// Delete document
router.delete('/:id', (req, res) => {
  const index = documents.findIndex(d => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const document = documents[index];
  
  // Delete file
  try {
    fs.unlinkSync(`./uploads/${document.fileName}`);
  } catch (e) {
    // File might not exist
  }

  documents.splice(index, 1);
  res.json({ success: true });
});

export default router;
