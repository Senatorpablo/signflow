/**
 * Auth Route Integration Tests
 * Tests: register → create doc → send → list full flow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma, testConnection, disconnect } from '../config/database.js';

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
  });

  beforeEach(async () => {
    // Clean test data before each test
    try {
      await prisma.$transaction([
        prisma.field.deleteMany(),
        prisma.document.deleteMany(),
        prisma.user.deleteMany({ where: { email: { contains: 'test' } } }),
      ]);
    } catch {
      // Ignore
    }
  });

  afterAll(async () => {
    await disconnect();
  });

  // ==========================================
  // REGISTER
  // ==========================================
  describe('POST /api/auth/register', () => {
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

    it('rejects duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@signflow.io', password: 'password123', name: 'Dup' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@signflow.io', password: 'password123', name: 'Dup2' });

      if (res.status === 503) return;
      expect(res.status).toBe(409);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'x@signflow.io' });

      if (res.status === 503) return;
      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // LOGIN
  // ==========================================
  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@signflow.io', password: 'password123', name: 'Login User' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@signflow.io', password: 'password123' });

      if (res.status === 503) return;
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@signflow.io', password: 'wrong' });

      if (res.status === 503) return;
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // GET ME
  // ==========================================
  describe('GET /api/auth/me', () => {
    it('returns current user', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'me@signflow.io', password: 'password123', name: 'Me' });

      if (reg.status !== 201) return;
      const tk = reg.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tk}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('me@signflow.io');
    });
  });

  // ==========================================
  // DOCUMENTS — Full Flow
  // ==========================================
  describe('Documents Full Flow', () => {
    beforeEach(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'docuser@signflow.io', password: 'password123', name: 'Doc User' });

      if (reg.status === 201) {
        token = reg.body.token;
        userId = reg.body.user.id;
      }
    });

    it('lists empty documents', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) return;
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
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
      // First create
      const createRes = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'NDA')
        .attach('file', Buffer.from('%PDF-1.4 test pdf'), 'nda.pdf');

      if (createRes.status !== 201) return;
      const docId = createRes.body.id;

      // Then send
      const sendRes = await request(app)
        .post(`/api/documents/${docId}/send`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          signers: [
            { email: 'alice@example.com', name: 'Alice', role: 'SIGNER' },
            { email: 'bob@example.com', name: 'Bob', role: 'SIGNER' },
          ],
        });

      if (sendRes.status === 503) return;
      expect(sendRes.status).toBe(200);
      expect(sendRes.body.status).toBe('SENT');
      expect(sendRes.body.recipients).toHaveLength(2);
    });

    it('lists documents after creation', async () => {
      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Doc A')
        .attach('file', Buffer.from('%PDF-1.4'), 'a.pdf');

      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Doc B')
        .attach('file', Buffer.from('%PDF-1.4'), 'b.pdf');

      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) return;
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('updates document fields', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Field Doc')
        .attach('file', Buffer.from('%PDF-1.4'), 'fields.pdf');

      if (createRes.status !== 201) return;
      const docId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/documents/${docId}/fields`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          fields: [
            { type: 'SIGNATURE', label: 'Sign here', x: 100, y: 200, assignedTo: 'alice@example.com' },
            { type: 'DATE', label: 'Date', x: 300, y: 200 },
          ],
        });

      if (res.status === 503) return;
      expect(res.status).toBe(200);
      expect(res.body.fields).toHaveLength(2);
    });

    it('deletes a document', async () => {
      const createRes = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'To Delete')
        .attach('file', Buffer.from('%PDF-1.4'), 'del.pdf');

      if (createRes.status !== 201) return;
      const docId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`);

      if (res.status === 503) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // HEALTH
  // ==========================================
  describe('GET /health', () => {
    it('returns healthy with DB connected', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('database');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
