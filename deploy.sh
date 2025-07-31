#!/bin/bash

echo "🚀 Starting production deployment..."

# Build the application
echo "📦 Building application..."
npm run build:prod

# Install production dependencies only
echo "📦 Installing production dependencies..."
npm ci --only=production

# Run security audit
echo "🔒 Running security audit..."
npm audit --audit-level moderate

# Start the application
echo "🌟 Starting application..."
npm run start:prod

echo "✅ Deployment completed!"
