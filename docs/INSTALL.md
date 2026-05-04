# Installation Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## Quick Install (Docker)

```bash
# Clone repository
git clone https://github.com/signflowco/signflow.git
cd signflow

# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec app npm run prisma:migrate

# Create admin user
docker-compose exec app npm run prisma:seed
```

## Manual Install

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb signflow

# Create Redis (optional, for caching)
redis-server
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Run migrations
npx prisma migrate dev

# Start server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env

# Start dev server
npm run dev
```

### 4. Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/signflow` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | Required |
| `STORAGE_TYPE` | Storage backend (local/s3) | `local` |
| `SMTP_HOST` | SMTP server for emails | Optional |
| `FRONTEND_URL` | Frontend URL | `http://localhost:5173` |

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Port Conflicts
```bash
# Check ports
lsof -i :3000
lsof -i :5173
lsof -i :5432
```

### Reset Everything
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d    # Start fresh
```
