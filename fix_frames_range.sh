#!/bin/bash
# إصلاح مجموعة محددة من الإطارات
# الاستخدام: ./fix_frames_range.sh 10 15

if [ $# -ne 2 ]; then
    echo "❌ خطأ: يجب تحديد رقم البداية والنهاية"
    echo "الاستخدام: $0 <من> <إلى>"
    echo "مثال: $0 10 15"
    exit 1
fi

START=$1
END=$2

if [ $START -lt 10 ] || [ $END -gt 42 ] || [ $START -gt $END ]; then
    echo "❌ خطأ: الأرقام يجب أن تكون بين 10 و 42"
    exit 1
fi

echo ""
echo "⚡ ======================================================================"
echo "⚡  إصلاح الإطارات من $START إلى $END"
echo "⚡ ======================================================================"
echo ""

SUCCESS=0
FAILED=0
TOTAL=$((END - START + 1))

for i in $(seq $START $END); do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 معالجة الإطار $i..."
    echo ""
    
    if python3 /workspace/animate_frames_lightning_fixed.py $i; then
        SUCCESS=$((SUCCESS + 1))
        echo "✅ نجح الإطار $i"
    else
        FAILED=$((FAILED + 1))
        echo "❌ فشل الإطار $i"
    fi
    
    echo ""
done

echo ""
echo "✅ ======================================================================"
echo "✅  اكتملت المعالجة!"
echo "✅ ======================================================================"
echo ""
echo "📊 النتائج:"
echo "   ✅ نجح: $SUCCESS/$TOTAL"
echo "   ❌ فشل: $FAILED/$TOTAL"
echo ""
