# =============================================================================
# EduManage School Management System — Multi-Stage Production Dockerfile
# =============================================================================

# --- Stage 1: Build & Bundle ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies (including devDependencies needed for compiling TypeScript & Vite)
RUN npm install && npm install --prefix client && npm install --prefix server

# Copy source trees
COPY client ./client
COPY server ./server

# Build client SPA and server TypeScript binaries
RUN npm run build:client
RUN npm run build:server

# --- Stage 2: Production Lean Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root & server package manifests
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies in server
RUN npm install --prefix server --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Use unprivileged node user for container security
USER node

EXPOSE 5000

# Container liveness check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["npm", "run", "start", "--prefix", "server"]
