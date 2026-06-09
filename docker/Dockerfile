# =============================================================================
# NanoXplore RH — Multi-stage Dockerfile
#
# Stage 1 (client-builder): Compiles the Vite/React MPA into static assets.
# Stage 2 (server):         Runs the Express server and serves compiled assets.
#
# Build:  docker build -t nanoxplore-rh .
# Run:    docker run -p 3000:3000 --env-file .env nanoxplore-rh
# =============================================================================

# ── Stage 1 — Build the React/Vite frontend ────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /build/client

# Install dependencies first (layer cache)
COPY frontend-v2/package*.json ./
RUN npm install

# Copy source and build
COPY frontend-v2/ .
ENV VITE_LDAP_ENABLED=true
RUN npx vite build --outDir /build/dist --emptyOutDir


# ── Stage 2 — Production Express server ───────────────────────────────────
FROM node:20-alpine AS server

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install production dependencies only
COPY mongo/server/package*.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# Copy server source
COPY mongo/server/ .

# Copy compiled client assets into Express's static directory
COPY --from=client-builder /build/dist ./public

# Dossiers inscriptibles par l'utilisateur non-root :
#  - /data/uploads : documents RH (un volume monté ici hérite de la propriété)
#  - /app/logs : fichiers de log winston en production (chemin relatif au cwd)
RUN mkdir -p /data/uploads /app/logs && chown -R appuser:appgroup /data /app/logs

# Run as non-root
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "index.js"]
