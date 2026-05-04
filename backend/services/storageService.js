/**
 * Storage Service
 * File storage abstraction (local/S3)
 */

import fs from 'fs';
import path from 'path';

export const uploadFile = async (filePath, destination) => {
  // Local storage - just return the path
  return filePath;
};

export const getFileUrl = (key) => {
  return `/uploads/${key}`;
};

export const deleteFile = async (key) => {
  try {
    fs.unlinkSync(`./uploads/${key}`);
  } catch (e) {
    // File might not exist
  }
};

export default { uploadFile, getFileUrl, deleteFile };
