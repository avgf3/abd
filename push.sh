#!/bin/bash

# سكريبت رفع الملفات إلى Git بشكل سريع
# Arabic Git Push Script

echo "🚀 سكريبت رفع الملفات إلى Git"
echo "================================"

# فحص إذا كان Git مهيأ
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ خطأ: هذا المجلد ليس Git repository"
    echo "💡 تشغيل: git init"
    exit 1
fi

# عرض حالة Git الحالية
echo ""
echo "📊 حالة Git الحالية:"
echo "--------------------"
git status --short

# تحديد الرسالة
DATE=$(date '+%Y-%m-%d %H:%M')
DEFAULT_MESSAGE="🔧 تحديث المشروع - $DATE

✅ إصلاح مشاكل النشر والـ dependencies
✅ تحديث إعدادات Vite و package.json  
✅ إزالة التضارب في المكتبات
✅ تحسين ملفات البناء والنشر
✅ إضافة سكريبتات النشر المحسنة

جاهز للنشر على Render! 🚀"

echo ""
echo "🎯 اختر طريقة الرفع:"
echo "1) رفع سريع (رسالة تلقائية)"
echo "2) رفع مخصص (اكتب رسالتك)"
echo "3) إلغاء"
echo ""
read -p "👉 اختيارك (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 رفع سريع بالرسالة الافتراضية..."
        echo ""
        echo "📝 رسالة الكوميت:"
        echo "-------------------"
        echo "$DEFAULT_MESSAGE"
        echo "-------------------"
        echo ""
        
        # إضافة الملفات
        echo "⏳ إضافة جميع الملفات..."
        git add .
        
        if [ $? -eq 0 ]; then
            echo "✅ تم إضافة الملفات بنجاح"
        else
            echo "❌ فشل في إضافة الملفات"
            exit 1
        fi
        
        # عمل commit
        echo "⏳ عمل commit..."
        git commit -m "$DEFAULT_MESSAGE"
        
        if [ $? -eq 0 ]; then
            echo "✅ تم عمل commit بنجاح"
        else
            echo "❌ فشل في عمل commit"
            exit 1
        fi
        
        # رفع للريبو
        echo "⏳ رفع الملفات للريبو..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 تم رفع جميع الملفات بنجاح!"
            echo "🔗 يمكنك الآن النشر على Render"
            echo "📋 استخدم الإعدادات من ملف RENDER_DEPLOY.md"
        else
            echo "❌ فشل في رفع الملفات"
            echo "💡 تأكد من اتصال الإنترنت وصلاحيات Git"
            exit 1
        fi
        ;;
        
    2)
        echo ""
        read -p "✏️ اكتب رسالة الكوميت: " user_message
        
        if [ -z "$user_message" ]; then
            MESSAGE="$DEFAULT_MESSAGE"
            echo "💡 استخدام الرسالة الافتراضية"
        else
            MESSAGE="$user_message"
        fi
        
        echo ""
        echo "📝 رسالة الكوميت:"
        echo "-------------------"
        echo "$MESSAGE"
        echo "-------------------"
        echo ""
        
        # إضافة الملفات
        echo "⏳ إضافة جميع الملفات..."
        git add .
        
        if [ $? -eq 0 ]; then
            echo "✅ تم إضافة الملفات بنجاح"
        else
            echo "❌ فشل في إضافة الملفات"
            exit 1
        fi
        
        # عمل commit
        echo "⏳ عمل commit..."
        git commit -m "$MESSAGE"
        
        if [ $? -eq 0 ]; then
            echo "✅ تم عمل commit بنجاح"
        else
            echo "❌ فشل في عمل commit"
            exit 1
        fi
        
        # رفع للريبو
        echo "⏳ رفع الملفات للريبو..."
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 تم رفع جميع الملفات بنجاح!"
            echo "🔗 يمكنك الآن النشر على Render"
        else
            echo "❌ فشل في رفع الملفات"
            exit 1
        fi
        ;;
        
    3)
        echo "❌ تم الإلغاء"
        exit 0
        ;;
        
    *)
        echo "❌ خيار غير صحيح"
        exit 1
        ;;
esac

echo ""
echo "🎯 نصائح للنشر على Render:"
echo "• Build Command: npm install --legacy-peer-deps && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
echo "• Start Command: npm start"
echo "• Node Version: 22.x"
echo ""
echo "✅ انتهى!"