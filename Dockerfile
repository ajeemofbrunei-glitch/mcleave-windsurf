# Multi-stage build for McLeave
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Setup backend
FROM node:18-alpine

WORKDIR /app

# Copy backend files
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/mcleave.db

# Start server
CMD ["node", "server/server.js"]
