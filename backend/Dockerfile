FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client for pg_isready
RUN apk add --no-cache postgresql-client

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Make wait script executable
RUN chmod +x wait-for-postgres.sh

EXPOSE 3000

# Wait for Postgres, then start
CMD ["sh", "-c", "./wait-for-postgres.sh db npm start"]
