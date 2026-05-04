/**
 * Storage utilities
 */
export const getUploadPath = (filename) => `./uploads/${filename}`;
export const saveFile = (buffer, filename) => {
  fs.writeFileSync(`./uploads/${filename}`, buffer);
  return filename;
};
export const deleteFile = (filename) => {
  try {
    fs.unlinkSync(`./uploads/${filename}`);
  } catch (e) {}
};
export const getFileUrl = (filename) => `/uploads/${filename}`;

import fs from 'fs';
export default { getUploadPath, saveFile, deleteFile, getFileUrl };
