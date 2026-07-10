# =============================================================================
# GPS Relay Server - Production Dockerfile
# =============================================================================
# Multi-stage build for minimal production image
#
# Build:
#   docker build -t gps-relay-server ./gps-relay-server
#
# Run:
#   docker run -d -p 3001:3001 \
#     -e PORT=3001 \
#     -e LOG_LEVEL=info \
#     --name gps-relay \
#     gps-relay-server
# =============================================================================

# ---- Stage 1: Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Stage 2: Build React app ----
FROM base AS builder
RUN apk add --no-cache curl
# Copy and build the React app
COPY ../package.json ../package-lock.json ./
COPY ../vite.config.ts ./
COPY ../tsconfig*.json ./
COPY ../src ./src
COPY ../public ./public
COPY ../index.html ./
# Install all dependencies for build
RUN npm ci
RUN npm run build

# ---- Stage 3: Production ----
FROM base AS production
RUN apk add --no-cache curl

# Copy application code
COPY server.js .
COPY public/ ./public/

# Copy React build (served as main app)
COPY --from=builder /app/dist/ ./dist/

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

EXPOSE ${PORT:-3001}

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info

CMD ["node", "server.js"]