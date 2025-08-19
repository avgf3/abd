#!/bin/bash

# سكريبت تنظيم ملفات الإطارات SVG
# ينقل جميع ملفات الإطارات إلى المجلد الصحيح

echo "🖼️  بدء تنظيم ملفات الإطارات..."

# إنشاء مجلد الإطارات إذا لم يكن موجود
FRAMES_DIR="client/public/uploads/frames"
mkdir -p "$FRAMES_DIR"

echo "📁 تم إنشاء مجلد: $FRAMES_DIR"

# قائمة بأسماء ملفات الإطارات الصحيحة
declare -a FRAME_FILES=(
  "enhanced-crown-frame.svg"
  "crown-frame-silver.svg"
  "crown-frame-rosegold.svg"
  "crown-frame-blue.svg"
  "crown-frame-emerald.svg"
  "crown-frame-purple.svg"
  "crown-frame-classic-gold.svg"
  "crown-frame-classic-coolpink.svg"
  "svip1-frame-gold.svg"
  "svip1-frame-pink.svg"
  "svip2-frame-gold.svg"
  "svip2-frame-pink.svg"
  "wings-frame-king.svg"
  "wings-frame-queen.svg"
)

# عداد للملفات المنقولة
moved_count=0
missing_count=0

echo "🔍 البحث عن ملفات الإطارات..."

# البحث في المجلدات المختلفة
for file in "${FRAME_FILES[@]}"; do
  found=false
  
  # البحث في client/public
  if [ -f "client/public/$file" ]; then
    echo "✅ نقل: $file من client/public"
    mv "client/public/$file" "$FRAMES_DIR/"
    ((moved_count++))
    found=true
  fi
  
  # البحث في المجلد الرئيسي
  if [ -f "$file" ] && [ "$found" = false ]; then
    echo "✅ نقل: $file من المجلد الرئيسي"
    mv "$file" "$FRAMES_DIR/"
    ((moved_count++))
    found=true
  fi
  
  # البحث في svgs
  if [ -f "svgs/$file" ] && [ "$found" = false ]; then
    echo "✅ نقل: $file من svgs"
    mv "svgs/$file" "$FRAMES_DIR/"
    ((moved_count++))
    found=true
  fi
  
  # إذا لم يتم العثور على الملف
  if [ "$found" = false ]; then
    echo "❌ لم يتم العثور على: $file"
    ((missing_count++))
  fi
done

echo ""
echo "📊 ملخص التنظيم:"
echo "   ✅ تم نقل: $moved_count ملف"
echo "   ❌ مفقود: $missing_count ملف"
echo ""

# التحقق من الملفات في المجلد النهائي
echo "📋 الملفات الموجودة في $FRAMES_DIR:"
ls -la "$FRAMES_DIR" | grep ".svg"

echo ""
echo "✨ تم الانتهاء من تنظيم ملفات الإطارات!"

# إذا كانت هناك ملفات مفقودة، اعرض تعليمات
if [ $missing_count -gt 0 ]; then
  echo ""
  echo "⚠️  تحذير: هناك ملفات إطارات مفقودة!"
  echo "   يمكنك إنشاؤها أو تعطيلها في الكود."
fi