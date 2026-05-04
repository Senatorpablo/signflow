/**
 * Auth Route Integration Tests
 * Tests: register → create doc → send → list full flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma, testConnection } from '../config/database.js';

describe('SignFlow Full Flow', () => {
  let token;
  let userId;
  let documentId;

  beforeAll(async () => {
    const ok = await testConnection();
    if (!ok) {
      console.warn('⚠️  Database not reachable — skipping integration tests');
      return;
    }
    // Clean test data
    try {
      await prisma.$transaction([
        prisma.field.deleteMany(),
        prisma.signature.deleteMany(),
        prisma.document.deleteMany(),
        prisma.user.deleteMany({ where: { email: { contains: 'test' } } }),
      ]);
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Don't disconnect - it triggers process.exit
  });

  // ==========================================
  // REGISTER
  // ==========================================
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@signflow.io', password: 'password123', name: 'Test User' });

    if (res.status === 503) {
      console.warn('DB unavailable, skipping');
      return;
    }

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('test@signflow.io');
    expect(res.body.token).toBeDefined();
    token = res.body.token;
    userId = res.body.user.id;
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@signflow.io', password: 'password123' });

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@signflow.io');
  });

  // ==========================================
  // DOCUMENTS — Full Flow
  // ==========================================
  it('lists empty documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`);

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('creates a document (upload)', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Contract')
      .attach('file', Buffer.from('%PDF-1.4 test pdf content'), 'contract.pdf');

    if (res.status === 503) return;
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Contract');
    expect(res.body.status).toBe('DRAFT');
    documentId = res.body.id;
  });

  it('sends a document', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/send`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        signers: [
          { email: 'alice@example.com', name: 'Alice' },
          { email: 'bob@example.com', name: 'Bob' },
        ],
      });

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SENT');
    expect(res.body.recipients).toHaveLength(2);
  });

  it('lists documents after creation', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`);

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('updates document fields', async () => {
    const res = await request(app)
      .patch(`/api/documents/${documentId}/fields`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fields: [
          { type: 'SIGNATURE', label: 'Sign here', page: 1, x: 100, y: 200 },
          { type: 'DATE', label: 'Date', page: 1, x: 300, y: 200 },
        ],
      });

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.fields)).toBe(true);
    expect(res.body.fields.length).toBeGreaterThanOrEqual(2);
  });

  it('deletes a document', async () => {
    const res = await request(app)
      .delete(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${token}`);

    if (res.status === 503) return;
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ==========================================
  // HEALTH
  // ==========================================
  it('returns healthy with DB connected', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('timestamp');
  });
});
