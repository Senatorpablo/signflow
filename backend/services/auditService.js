/**
 * Audit Service
 * Simple audit logging to console/DB
 */

import { prisma } from '../config/database.js';

export const logAudit = async (data) => {
  try {
    console.log(`[AUDIT] ${data.action} by ${data.userId || 'system'}:`, data.metadata);
    // Could also save to DB if AuditLog table exists
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

export default { logAudit };
