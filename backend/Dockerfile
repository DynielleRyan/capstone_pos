# Simple Dockerfile for Railway - Single stage to avoid buildkit issues
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (needed for TypeScript build)
RUN npm ci

# Copy source files
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port (Railway sets PORT via environment variable)
EXPOSE 5002

# Start the application
CMD ["npm", "start"]

