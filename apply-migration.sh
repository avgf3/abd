#!/bin/bash

# تطبيق migration لإضافة حقل currentRoom لجدول users

echo "🔄 تطبيق migration لإضافة حقل currentRoom..."

# التحقق من وجود متغير DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ متغير DATABASE_URL غير محدد"
    exit 1
fi

# تطبيق migration
echo "📝 تطبيق migration..."

# استخدام psql إذا كان متوفراً
if command -v psql &> /dev/null; then
    echo "✅ استخدام psql..."
    psql "$DATABASE_URL" -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_room TEXT DEFAULT 'general';"
    psql "$DATABASE_URL" -c "UPDATE users SET current_room = 'general' WHERE current_room IS NULL;"
    psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room);"
else
    echo "⚠️ psql غير متوفر، يرجى تطبيق migration يدوياً:"
    echo ""
    echo "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_room TEXT DEFAULT 'general';"
    echo "UPDATE users SET current_room = 'general' WHERE current_room IS NULL;"
    echo "CREATE INDEX IF NOT EXISTS idx_users_current_room ON users(current_room);"
    echo ""
    echo "💡 يمكنك استخدام أي أداة قاعدة بيانات مثل pgAdmin أو DBeaver"
fi

echo "✅ انتهى تطبيق migration"