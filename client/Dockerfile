# =============================================================================
# client/Dockerfile — Vite dev server in container
#
# Sert le frontend React avec HMR sur le port 5173.
# Les appels /api sont proxifiés vers le service "app" (Express).
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# Install dependencies (layer cache)
COPY package*.json ./
RUN npm install

# Copy source — volumes will override this in dev
COPY . .

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
