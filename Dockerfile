# Simple Node web container serving the static game and save API
FROM node:20-alpine AS base

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Install server deps
COPY server/package.json ./server/package.json
RUN --mount=type=cache,target=/root/.npm \
    cd server && npm install --omit=dev --no-audit --no-fund

# Copy app source (static root + server)
COPY . .

# Expose port and run server
EXPOSE 8080

# Persisted saves will go to /data when a volume is mounted; set defaults here
ENV PUBLIC_DIR=/app \
    DATA_PATH=/data/saves.json

CMD ["node", "server/server.js"]
