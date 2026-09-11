# Build and runtime container for Myavana Chatbot (Cloud Run)
FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root manifest and lockfiles
COPY package*.json ./
COPY packages/chat-protocol/package*.json ./packages/chat-protocol/
COPY packages/core/package*.json ./packages/core/
COPY packages/myavana/package*.json ./packages/myavana/
COPY packages/widget/package*.json ./packages/widget/
COPY packages/react-native-sdk/package*.json ./packages/react-native-sdk/

# Install dependencies across all workspaces
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code
COPY packages ./packages

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run listens on PORT
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the Myavana Express server
CMD ["node", "packages/myavana/src/index.js"]
