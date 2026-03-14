# ─────────────────────────────────────────────────────────────────────────────
# Base: Node 20 on Alpine with Chromium (required by Puppeteer handlers)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Install Chromium and required system libs for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # needed for Puppeteer on Alpine
    udev \
    ttf-opensans

# Tell Puppeteer to skip downloading its own Chromium and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Create app directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose the API port
EXPOSE 3000

# ─────────────────────────────────────────────────────────────────────────────
# Default start command = API server.
# For the worker service on Render, override with:  node worker.js
# ─────────────────────────────────────────────────────────────────────────────
CMD ["node", "src/server.js"]
