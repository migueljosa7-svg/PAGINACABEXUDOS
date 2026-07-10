# =============================================================================
# PAGINACABEXUDOS - Full Application Dockerfile
# =============================================================================
# Serves both the React frontend and GPS Relay WebSocket server
#
# Build:
#   docker build -t paginacabexudos .
#
# Run:
#   docker run -d -p 3001:3001 \
#     -e PORT=3001 \
#     -e LOG_LEVEL=info \
#     --name paginacabexudos \
#     paginacabexudos
# =============================================================================

# ---- Stage 1: Build React app ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies for the relay server
RUN npm install ws

# Copy the server
COPY server.js ./server.js

# Copy the built React app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3001}/health || exit 1

EXPOSE ${PORT:-3001}

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV LOG_LEVEL=info

CMD ["node", "server.js"]