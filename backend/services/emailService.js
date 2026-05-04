import nodemailer from 'nodemailer';
import winston from 'winston';
import { config } from '../config/index.js';

const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class EmailService {
  constructor() {
    this.provider = this.detectProvider();
    this.transporter = null;
    this.consoleMode = false;

    if (config.email.provider === 'console' || !this.hasValidSmtpConfig()) {
      this.consoleMode = true;
      logger.info('EmailService running in console mode (no SMTP configured)');
    } else {
      this.createTransporter();
    }
  }

  detectProvider() {
    if (process.env.SENDGRID_API_KEY) return 'sendgrid';
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return 'mailgun';
    return config.email.provider || 'smtp';
  }

  hasValidSmtpConfig() {
    return !!(config.email.smtpHost && config.email.smtpPort && config.email.smtpUser && config.email.smtpPass);
  }

  createTransporter() {
    const smtpConfig = {
      host: config.email.smtpHost,
      port: parseInt(config.email.smtpPort, 10),
      secure: parseInt(config.email.smtpPort, 10) === 465,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass
      }
    };

    if (config.email.smtpTlsRejectUnauthorized === false) {
      smtpConfig.tls = { rejectUnauthorized: false };
    }

    this.transporter = nodemailer.createTransport(smtpConfig);

    this.transporter.verify((error) => {
      if (error) {
        logger.warn('SMTP connection failed, falling back to console mode:', error.message);
        this.consoleMode = true;
        this.transporter = null;
      } else {
        logger.info('SMTP transporter ready');
      }
    });
  }

  async send({ to, subject, html, text, from, replyTo, attachments }) {
    // Force console mode fallback if SMTP fails (e.g., bad credentials)
    if (!this.consoleMode && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: from || config.email.from,
          to,
          subject,
          html,
          text,
          replyTo,
          attachments
        });
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
      } catch (error) {
        logger.warn(`SMTP send failed for ${to}, falling back to console:`, error.message);
        this.consoleMode = true;
        this.transporter = null;
      }
    }

    // Console fallback
    const mailOptions = {
      from: from || config.email.from,
      to,
      subject,
      html,
      text,
      replyTo,
      attachments
    };
    this.logToConsole(mailOptions);
    return { messageId: `console-${Date.now()}`, accepted: [to], rejected: [] };
  }

  logToConsole(mailOptions) {
    const separator = '='.repeat(60);
    logger.info(separator);
    logger.info('📧 EMAIL (Console Mode - Not Sent)');
    logger.info(`To: ${mailOptions.to}`);
    logger.info(`From: ${mailOptions.from}`);
    logger.info(`Subject: ${mailOptions.subject}`);
    logger.info(`Reply-To: ${mailOptions.replyTo || 'N/A'}`);
    if (mailOptions.attachments) {
      logger.info(`Attachments: ${mailOptions.attachments.map(a => a.filename || a.path).join(', ')}`);
    }
    logger.info('-'.repeat(40));
    logger.info('HTML:');
    logger.info(mailOptions.html ? mailOptions.html.substring(0, 1000) + (mailOptions.html.length > 1000 ? '...' : '') : 'N/A');
    logger.info('-'.repeat(40));
    logger.info('Text:');
    logger.info(mailOptions.text || 'N/A');
    logger.info(separator);
  }

  // Template senders
  async sendWelcome({ to, name }) {
    const { html, text } = this.renderTemplate('welcome', { name });
    return this.send({ to, subject: 'Welcome to SignFlow!', html, text });
  }

  async sendPasswordReset({ to, name, resetUrl }) {
    const { html, text } = this.renderTemplate('passwordReset', { name, resetUrl });
    return this.send({ to, subject: 'Reset your SignFlow password', html, text });
  }

  async sendSignatureRequest({ to, name, documentName, senderName, signUrl, message }) {
    const { html, text } = this.renderTemplate('signatureRequest', {
      name,
      documentName,
      senderName,
      signUrl,
      message
    });
    return this.send({
      to,
      subject: `${senderName} requested your signature on "${documentName}"`,
      html,
      text
    });
  }

  async sendReminder({ to, name, documentName, senderName, signUrl, daysPending }) {
    const { html, text } = this.renderTemplate('reminder', {
      name,
      documentName,
      senderName,
      signUrl,
      daysPending
    });
    return this.send({
      to,
      subject: `Reminder: Please sign "${documentName}"`,
      html,
      text
    });
  }

  async sendCompleted({ to, name, documentName, downloadUrl }) {
    const { html, text } = this.renderTemplate('completed', {
      name,
      documentName,
      downloadUrl
    });
    return this.send({
      to,
      subject: `"${documentName}" has been fully signed`,
      html,
      text
    });
  }

  renderTemplate(templateName, variables = {}) {
    const templates = {
      welcome: () => ({
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Welcome</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <h1 style="color: #4F46E5;">Welcome to SignFlow!</h1>
    <p>Hi ${variables.name || 'there'},</p>
    <p>Thanks for signing up. SignFlow makes document signing simple, secure, and fast.</p>
    <p><a href="${config.frontendUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Get Started</a></p>
    <p style="color: #666; font-size: 12px;">If you didn't sign up, you can ignore this email.</p>
  </div>
</body>
</html>`,
        text: `Welcome to SignFlow!\n\nHi ${variables.name || 'there'},\n\nThanks for signing up. SignFlow makes document signing simple, secure, and fast.\n\nGet started: ${config.frontendUrl}\n\nIf you didn't sign up, you can ignore this email.`
      }),
      passwordReset: () => ({
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Reset Password</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <h1 style="color: #4F46E5;">Reset Your Password</h1>
    <p>Hi ${variables.name || 'there'},</p>
    <p>We received a request to reset your SignFlow password. Click the button below to choose a new password:</p>
    <p><a href="${variables.resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
    <p>Or copy and paste this link: <a href="${variables.resetUrl}">${variables.resetUrl}</a></p>
    <p>This link expires in 1 hour.</p>
    <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`,
        text: `Reset Your Password\n\nHi ${variables.name || 'there'},\n\nWe received a request to reset your SignFlow password. Visit this link to choose a new password:\n${variables.resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`
      }),
      signatureRequest: () => ({
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Signature Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <h1 style="color: #4F46E5;">Signature Request</h1>
    <p>Hi ${variables.name || 'there'},</p>
    <p><strong>${variables.senderName || 'Someone'}</strong> has requested your signature on <strong>${variables.documentName || 'a document'}</strong>.</p>
    ${variables.message ? `<blockquote style="border-left: 3px solid #4F46E5; padding-left: 12px; color: #555;">${variables.message}</blockquote>` : ''}
    <p><a href="${variables.signUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Review & Sign Document</a></p>
    <p style="color: #666; font-size: 12px;">This is a secure document-signing request from SignFlow.</p>
  </div>
</body>
</html>`,
        text: `Signature Request\n\nHi ${variables.name || 'there'},\n\n${variables.senderName || 'Someone'} has requested your signature on "${variables.documentName || 'a document'}".\n\n${variables.message ? `Message: ${variables.message}\n\n` : ''}Review and sign: ${variables.signUrl}\n\nThis is a secure document-signing request from SignFlow.`
      }),
      reminder: () => ({
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Reminder</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <h1 style="color: #4F46E5;">Reminder: Signature Pending</h1>
    <p>Hi ${variables.name || 'there'},</p>
    <p>This is a friendly reminder that <strong>${variables.senderName || 'Someone'}</strong> is waiting for your signature on <strong>${variables.documentName || 'a document'}</strong>.</p>
    <p>Pending for: <strong>${variables.daysPending || 'several'} days</strong></p>
    <p><a href="${variables.signUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Sign Now</a></p>
    <p style="color: #666; font-size: 12px;">This reminder was sent automatically by SignFlow.</p>
  </div>
</body>
</html>`,
        text: `Reminder: Signature Pending\n\nHi ${variables.name || 'there'},\n\nThis is a friendly reminder that ${variables.senderName || 'Someone'} is waiting for your signature on "${variables.documentName || 'a document'}".\n\nPending for: ${variables.daysPending || 'several'} days\n\nSign now: ${variables.signUrl}\n\nThis reminder was sent automatically by SignFlow.`
      }),
      completed: () => ({
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Document Completed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="padding: 20px;">
    <h1 style="color: #10B981;">Document Fully Signed! 🎉</h1>
    <p>Hi ${variables.name || 'there'},</p>
    <p>Good news — <strong>${variables.documentName || 'Your document'}</strong> has been fully signed by all parties.</p>
    <p><a href="${variables.downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px;">Download Signed Document</a></p>
    <p style="color: #666; font-size: 12px;">You can also access this document anytime from your SignFlow dashboard.</p>
  </div>
</body>
</html>`,
        text: `Document Fully Signed!\n\nHi ${variables.name || 'there'},\n\nGood news — "${variables.documentName || 'Your document'}" has been fully signed by all parties.\n\nDownload: ${variables.downloadUrl}\n\nYou can also access this document anytime from your SignFlow dashboard.`
      })
    };

    const render = templates[templateName];
    if (!render) {
      throw new Error(`Unknown email template: ${templateName}`);
    }
    return render();
  }
}

export const emailService = new EmailService();
export default emailService;
