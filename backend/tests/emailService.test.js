import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock winston before importing emailService
vi.mock('winston', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    json: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
  },
}));

// Mock config
vi.mock('../config/index.js', () => ({
  config: {
    logLevel: 'info',
    frontendUrl: 'http://localhost:5173',
    email: {
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPass: null,
      from: 'noreply@signflow.io',
      provider: 'console',
      queueEnabled: false,
      smtpTlsRejectUnauthorized: true
    }
  }
}));

const { emailService } = await import('../services/emailService.js');

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render welcome template', () => {
    const { html, text } = emailService.renderTemplate('welcome', { name: 'Alice' });
    expect(html).toContain('Alice');
    expect(html).toContain('Welcome to SignFlow!');
    expect(text).toContain('Alice');
    expect(text).toContain('Welcome to SignFlow!');
  });

  it('should render password reset template', () => {
    const resetUrl = 'http://localhost:5173/reset?token=abc123';
    const { html, text } = emailService.renderTemplate('passwordReset', { name: 'Bob', resetUrl });
    expect(html).toContain('Bob');
    expect(html).toContain(resetUrl);
    expect(text).toContain(resetUrl);
  });

  it('should render signature request template', () => {
    const { html, text } = emailService.renderTemplate('signatureRequest', {
      name: 'Charlie',
      documentName: 'Contract.pdf',
      senderName: 'Alice',
      signUrl: 'http://localhost:5173/sign/123',
      message: 'Please sign this ASAP'
    });
    expect(html).toContain('Charlie');
    expect(html).toContain('Contract.pdf');
    expect(html).toContain('Alice');
    expect(html).toContain('Please sign this ASAP');
    expect(text).toContain('Contract.pdf');
  });

  it('should render reminder template', () => {
    const { html, text } = emailService.renderTemplate('reminder', {
      name: 'Dave',
      documentName: 'NDA.pdf',
      senderName: 'Alice',
      signUrl: 'http://localhost:5173/sign/456',
      daysPending: 3
    });
    expect(html).toContain('Dave');
    expect(html).toContain('NDA.pdf');
    expect(html).toContain('3 days');
    expect(text).toContain('3 days');
  });

  it('should render completed template', () => {
    const { html, text } = emailService.renderTemplate('completed', {
      name: 'Eve',
      documentName: 'Agreement.pdf',
      downloadUrl: 'http://localhost:5173/download/789'
    });
    expect(html).toContain('Eve');
    expect(html).toContain('Agreement.pdf');
    expect(html).toContain('download/789');
    expect(text).toContain('download/789');
  });

  it('should throw on unknown template', () => {
    expect(() => emailService.renderTemplate('unknown', {})).toThrow('Unknown email template: unknown');
  });

  it('should send welcome email in console mode', async () => {
    const result = await emailService.sendWelcome({ to: 'test@example.com', name: 'Test' });
    expect(result.messageId).toMatch(/^console-/);
    expect(result.accepted).toContain('test@example.com');
  });

  it('should send signature request in console mode', async () => {
    const result = await emailService.sendSignatureRequest({
      to: 'signer@example.com',
      name: 'Signer',
      documentName: 'Doc.pdf',
      senderName: 'Owner',
      signUrl: 'http://localhost:5173/sign/1',
      message: 'Please sign'
    });
    expect(result.messageId).toMatch(/^console-/);
  });
});
