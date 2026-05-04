/**
 * PDF Service - PDF Processing with pdf-lib
 * Embed signatures, flatten documents, add fields
 */

import { PDFDocument, PDFName, PDFNumber, PDFString, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

/**
 * Load a PDF from file
 */
export const loadPDF = async (filePath) => {
  const bytes = fs.readFileSync(filePath);
  return PDFDocument.load(bytes);
};

/**
 * Save PDF to file
 */
export const savePDF = async (pdfDoc, outputPath) => {
  const bytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, bytes);
  return outputPath;
};

/**
 * Embed a signature image into a PDF
 */
export const embedSignature = async (inputPath, outputPath, signatureData) => {
  try {
    const pdfDoc = await loadPDF(inputPath);
    const pages = pdfDoc.getPages();

    // For now, embed on first page
    const page = pages[0];
    const { width, height } = page.getSize();

    // Extract base64 image data
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Try to embed as PNG or JPEG
    let image;
    try {
      image = await pdfDoc.embedPng(imageBuffer);
    } catch {
      image = await pdfDoc.embedJpg(imageBuffer);
    }

    // Place signature at bottom of page
    const sigWidth = 200;
    const sigHeight = 50;
    const x = width / 2 - sigWidth / 2;
    const y = 100;

    page.drawImage(image, {
      x,
      y,
      width: sigWidth,
      height: sigHeight,
    });

    await savePDF(pdfDoc, outputPath);
    console.log(`✅ Signature embedded: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('❌ Failed to embed signature:', error);
    throw error;
  }
};

/**
 * Add text fields to a PDF (for template building)
 */
export const addTextField = async (inputPath, outputPath, options) => {
  const { x, y, width, height, label, pageNumber = 0 } = options;

  const pdfDoc = await loadPDF(inputPath);
  const pages = pdfDoc.getPages();
  const page = pages[pageNumber];

  // Draw border for field
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.2, 0.4, 0.9),
    borderWidth: 1,
  });

  // Draw label
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(label || 'Signature', {
    x: x + 2,
    y: y + height - 12,
    size: 10,
    font,
    color: rgb(0.2, 0.4, 0.9),
  });

  await savePDF(pdfDoc, outputPath);
  return outputPath;
};

/**
 * Flatten a PDF (make signatures permanent)
 */
export const flattenPDF = async (inputPath, outputPath) => {
  const pdfDoc = await loadPDF(inputPath);
  
  // pdf-lib doesn't have direct flatten, but we can:
  // 1. Remove form fields
  // 2. Keep everything as drawn content
  
  const form = pdfDoc.getForm();
  form.flatten();

  await savePDF(pdfDoc, outputPath);
  console.log(`✅ PDF flattened: ${outputPath}`);
  return outputPath;
};

/**
 * Get PDF metadata
 */
export const getPDFInfo = async (filePath) => {
  const pdfDoc = await loadPDF(filePath);
  const pages = pdfDoc.getPages();

  return {
    pageCount: pages.length,
    pages: pages.map((page, i) => {
      const { width, height } = page.getSize();
      return { page: i + 1, width, height };
    }),
    title: pdfDoc.getTitle() || null,
    author: pdfDoc.getAuthor() || null,
  };
};

/**
 * Create signed PDF from original + signature data
 */
export const createSignedPDF = async (originalPath, signatureData, fieldPosition) => {
  const outputPath = originalPath.replace('.pdf', '-signed.pdf');

  // If no signature data, just return original
  if (!signatureData) {
    return originalPath;
  }

  await embedSignature(originalPath, outputPath, signatureData);
  return outputPath;
};

export default {
  loadPDF,
  savePDF,
  embedSignature,
  addTextField,
  flattenPDF,
  getPDFInfo,
  createSignedPDF,
};
