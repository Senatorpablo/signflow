import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '15m',
    refreshExpiresIn: '7d'
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpTlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    from: process.env.SMTP_FROM || 'noreply@signflow.io',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    mailgunDomain: process.env.MAILGUN_DOMAIN,
    queueEnabled: process.env.EMAIL_QUEUE_ENABLED !== 'false'
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET
    }
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceIdPro: process.env.STRIPE_PRICE_ID_PRO
  },

  logLevel: process.env.LOG_LEVEL || 'info'
};

export default config;
