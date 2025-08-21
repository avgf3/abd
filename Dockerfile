# Multi-stage Dockerfile for production build and run

FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build


FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy build artifacts
COPY --from=builder /app/dist ./dist

# App port (can be overridden by PORT env)
EXPOSE 5000

CMD ["node", "dist/index.js"]
