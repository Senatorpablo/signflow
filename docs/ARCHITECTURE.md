# SignFlow Architecture

## Overview

SignFlow is a modern e-signature platform built with:
- **Backend:** Node.js + Express + PostgreSQL + Redis
- **Frontend:** Vue 3 + Vite + Tailwind CSS
- **PDF Processing:** pdf-lib (pure JavaScript, no native deps)
- **Storage:** Local filesystem or S3-compatible
- **Email:** SMTP or transactional email providers

## System Architecture

```
┌─────────────────┐
│   Nginx (SSL)   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Vue 3 Frontend │
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP/REST
┌────────▼────────┐
│  Node.js API    │
│   (Port 3000)   │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    │         │             │
┌───▼───┐ ┌───▼───┐  ┌────▼────┐
│PostgreSQL│ │ Redis │  │  Storage  │
│(Data)   │ │(Cache)│  │(Files)    │
└─────────┘ └───────┘  └─────────┘
```

## Database Schema

### Core Tables
- **users** — Authentication and profiles
- **organizations** — Multi-tenancy
- **documents** — Document metadata and status
- **templates** — Reusable document templates
- **fields** — Signature/form fields on documents
- **signatures** — Signature records with audit data
- **audit_logs** — Immutable action logs
- **webhooks** — Webhook configurations
- **api_keys** — API authentication

### Key Design Decisions
- **UUID primary keys** — Prevent enumeration attacks
- **Soft deletes** — Preserve audit trail
- **JSONB columns** — Flexible metadata storage
- **Row-level security** — Multi-tenant data isolation

## Security

### Authentication
- JWT tokens with refresh token rotation
- OAuth 2.0 (Google, GitHub)
- API key authentication for integrations
- bcrypt password hashing (cost factor 12)

### Authorization
- RBAC (Role-Based Access Control)
- Organization-level isolation
- Document-level permissions
- Field-level access control

### Data Protection
- HTTPS/TLS everywhere
- Document encryption at rest
- Signature data encrypted
- Audit logs immutable

## Scaling

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
```

### Performance
- Redis caching for hot data
- CDN for static assets
- Database connection pooling
- Async job processing with Bull

## Deployment

### Production Checklist
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Health checks enabled
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backups scheduled

### Monitoring
- Health endpoint: `/health`
- Metrics: Prometheus-compatible
- Logging: Structured JSON logs
- Alerts: Configurable thresholds

## Development

### Local Setup
```bash
# Start dependencies
docker-compose up -d db redis

# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```
