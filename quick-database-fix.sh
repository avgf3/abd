#!/bin/bash

echo "🚀 Quick Database Fix Script"
echo "This script will add missing points system columns to your PostgreSQL database"
echo ""

# Check if DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    exit 1
fi

echo "📋 DATABASE_URL is set"
echo "🔧 Running database fixes..."

# Try to run the JavaScript fix script first
if [ -f "fix-production-points-database.mjs" ]; then
    echo "🔧 Running JavaScript fix script..."
    node fix-production-points-database.mjs
    if [ $? -eq 0 ]; then
        echo "✅ JavaScript fix script completed successfully"
        exit 0
    else
        echo "⚠️ JavaScript fix script failed, trying SQL approach..."
    fi
fi

# If JavaScript fails, try using psql directly
if command -v psql &> /dev/null; then
    echo "🔧 Running SQL fix using psql..."
    psql "$DATABASE_URL" -f emergency-points-fix.sql
    if [ $? -eq 0 ]; then
        echo "✅ SQL fix completed successfully"
    else
        echo "❌ SQL fix failed"
        exit 1
    fi
else
    echo "❌ psql command not found"
    echo "Please install PostgreSQL client tools or run the SQL commands manually"
    echo "SQL file: emergency-points-fix.sql"
    exit 1
fi

echo ""
echo "🎉 Database fix completed!"
echo "📝 Next steps:"
echo "  1. Restart your application"
echo "  2. Test the points system functionality"
echo "  3. Monitor the logs for any remaining errors"