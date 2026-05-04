FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy prisma schema
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
