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

# ---- Stage 2: Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts

# ---- Stage 3: Production ----
FROM base AS production
RUN apk add --no-cache curl

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY server.js .
COPY public/ ./public/

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