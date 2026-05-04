# Self-Hosting Guide

## 🏠 Why Self-Host?

- **Privacy:** Your documents never leave your servers
- **Cost:** Completely free, no per-user fees
- **Control:** Full data ownership and customization
- **Compliance:** Meet HIPAA, GDPR, SOC2 requirements

## 🚀 One-Command Deploy

```bash
curl -fsSL https://get.signflow.io | bash
```

## 🐳 Docker Deploy

### Production Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: signflow/app:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://signflow:password@db:5432/signflow
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-super-secret-key
      - STORAGE_TYPE=local
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your-email@gmail.com
      - SMTP_PASS=your-app-password
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=signflow
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=signflow
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### With SSL (Let's Encrypt)

```yaml
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    command: certonly --webroot -w /var/www/certbot --email admin@yourdomain.com -d yourdomain.com --agree-tos
```

## ☁️ Cloud Providers

### AWS EC2
```bash
# Launch Ubuntu 22.04 instance
curl -fsSL https://get.signflow.io | bash
```

### DigitalOcean Droplet
```bash
# Create droplet with Docker
docker-compose up -d
```

### Railway / Render / Fly.io
```bash
# Deploy directly from GitHub repo
railway up
```

## 🔒 Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable SSL/TLS
- [ ] Configure firewall (ufw)
- [ ] Set up automated backups
- [ ] Enable 2FA for admin accounts
- [ ] Configure fail2ban
- [ ] Set up log monitoring

## 📊 Monitoring

```bash
# View logs
docker-compose logs -f app

# Check health
curl http://localhost:3000/health

# Database status
docker-compose exec db pg_isready
```

## 🔄 Updates

```bash
# Pull latest images
docker-compose pull
docker-compose up -d

# Run migrations
docker-compose exec app npm run prisma:migrate
```

## 🆘 Getting Help

- 📖 [Documentation](https://docs.signflow.io)
- 💬 [Discord Community](https://discord.gg/signflow)
- 📧 [Email Support](mailto:support@signflow.io)
