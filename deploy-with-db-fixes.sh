#!/bin/bash

# Database Connection Pool Fixes Deployment Script
# This script sets recommended environment variables for production deployment

echo "🚀 Deploying with Database Connection Pool Fixes"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Set recommended environment variables for production
echo "📝 Setting recommended environment variables..."

# Connection Pool Settings - Conservative defaults
export DB_POOL_MAX=25
export DB_POOL_MIN=5
export DB_IDLE_TIMEOUT=300
export DB_MAX_LIFETIME=3600
export DB_CONNECT_TIMEOUT=60

# Error Handling and Retry Logic
export DB_RETRY_DELAY_MS=2000
export DB_MAX_ATTEMPTS=5
export DB_HEALTH_TIMEOUT_MS=5000
export DB_MONITOR_INTERVAL_MS=30000

# Check if PgBouncer is available
if [ "$USE_PGBOUNCER" = "true" ]; then
    echo "🔄 PgBouncer detected - using higher connection limits"
    export DB_POOL_MAX=50
    export DB_POOL_MIN=10
fi

# Display current configuration
echo ""
echo "📊 Current Database Configuration:"
echo "  DB_POOL_MAX: $DB_POOL_MAX"
echo "  DB_POOL_MIN: $DB_POOL_MIN"
echo "  DB_IDLE_TIMEOUT: $DB_IDLE_TIMEOUT seconds"
echo "  DB_MAX_LIFETIME: $DB_MAX_LIFETIME seconds"
echo "  USE_PGBOUNCER: ${USE_PGBOUNCER:-false}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL is not set"
    echo "   Please set your PostgreSQL connection string:"
    echo "   export DATABASE_URL='postgresql://user:pass@host:5432/dbname?sslmode=require'"
    echo ""
fi

# Build the application
echo "🔨 Building application..."
if ! npm run build; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Start the application
echo "🚀 Starting application with enhanced database connection handling..."
echo ""

# Show startup logs
echo "📋 Monitoring startup logs (Ctrl+C to stop):"
echo "   Watch for: '✅ Database startup successful'"
echo "   Or: '❌ Database startup failed'"
echo ""

# Start the server
npm start

# If we get here, the server has stopped
echo ""
echo "🛑 Server stopped"