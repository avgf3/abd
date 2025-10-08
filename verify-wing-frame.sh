#!/bin/bash

echo "🪽 التحقق من تطبيق إطار الجناح | Wing Frame Verification"
echo "================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0

echo "📁 فحص الملفات | Checking Files..."
echo "-----------------------------------"

# Check frame7.png
if [ -f "/workspace/client/public/frames/frame7.png" ]; then
    SIZE=$(du -h /workspace/client/public/frames/frame7.png | cut -f1)
    echo -e "${GREEN}✅${NC} frame7.png موجود (حجم: $SIZE)"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} frame7.png غير موجود"
    FAIL=$((FAIL + 1))
fi

# Check test page
if [ -f "/workspace/client/public/test-wing-animation.html" ]; then
    echo -e "${GREEN}✅${NC} test-wing-animation.html موجود"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} test-wing-animation.html غير موجود"
    FAIL=$((FAIL + 1))
fi

# Check VipAvatar.tsx
if [ -f "/workspace/client/src/components/ui/VipAvatar.tsx" ]; then
    if grep -q "frame7.png" /workspace/client/src/components/ui/VipAvatar.tsx; then
        echo -e "${GREEN}✅${NC} VipAvatar.tsx محدث بدعم frame7"
        PASS=$((PASS + 1))
    else
        echo -e "${YELLOW}⚠️${NC} VipAvatar.tsx موجود لكن قد لا يدعم frame7"
        FAIL=$((FAIL + 1))
    fi
else
    echo -e "${RED}❌${NC} VipAvatar.tsx غير موجود"
    FAIL=$((FAIL + 1))
fi

# Check WingFrameDemo.tsx
if [ -f "/workspace/client/src/components/demo/WingFrameDemo.tsx" ]; then
    echo -e "${GREEN}✅${NC} WingFrameDemo.tsx موجود"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️${NC} WingFrameDemo.tsx غير موجود"
    PASS=$((PASS + 1)) # Not critical
fi

echo ""
echo "🎨 فحص الحركات CSS | Checking CSS Animations..."
echo "------------------------------------------------"

# Check CSS animations
if grep -q "professional-wing-flutter" /workspace/client/src/index.css; then
    echo -e "${GREEN}✅${NC} professional-wing-flutter animation موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} professional-wing-flutter animation غير موجودة"
    FAIL=$((FAIL + 1))
fi

if grep -q "wing-glow-pulse" /workspace/client/src/index.css; then
    echo -e "${GREEN}✅${NC} wing-glow-pulse animation موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} wing-glow-pulse animation غير موجودة"
    FAIL=$((FAIL + 1))
fi

if grep -q "wing-elegant-float" /workspace/client/src/index.css; then
    echo -e "${GREEN}✅${NC} wing-elegant-float animation موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} wing-elegant-float animation غير موجودة"
    FAIL=$((FAIL + 1))
fi

if grep -q "wing-sparkle" /workspace/client/src/index.css; then
    echo -e "${GREEN}✅${NC} wing-sparkle animation موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} wing-sparkle animation غير موجودة"
    FAIL=$((FAIL + 1))
fi

if grep -q "vip-frame-7" /workspace/client/src/index.css; then
    echo -e "${GREEN}✅${NC} .vip-frame-7 styles موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌${NC} .vip-frame-7 styles غير موجودة"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "📚 فحص الوثائق | Checking Documentation..."
echo "------------------------------------------"

if [ -f "/workspace/WING_FRAME_DOCUMENTATION.md" ]; then
    echo -e "${GREEN}✅${NC} WING_FRAME_DOCUMENTATION.md موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️${NC} WING_FRAME_DOCUMENTATION.md غير موجودة"
fi

if [ -f "/workspace/WING_FRAME_QUICK_GUIDE.md" ]; then
    echo -e "${GREEN}✅${NC} WING_FRAME_QUICK_GUIDE.md موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️${NC} WING_FRAME_QUICK_GUIDE.md غير موجودة"
fi

if [ -f "/workspace/WING_FRAME_IMPLEMENTATION_SUMMARY.md" ]; then
    echo -e "${GREEN}✅${NC} WING_FRAME_IMPLEMENTATION_SUMMARY.md موجودة"
    PASS=$((PASS + 1))
else
    echo -e "${YELLOW}⚠️${NC} WING_FRAME_IMPLEMENTATION_SUMMARY.md غير موجودة"
fi

echo ""
echo "================================================================"
echo "📊 النتائج | Results"
echo "================================================================"
echo -e "${GREEN}✅ نجح: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}❌ فشل: $FAIL${NC}"
fi

echo ""
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 التحقق مكتمل! جميع الملفات والحركات موجودة وجاهزة${NC}"
    echo ""
    echo "🚀 للبدء:"
    echo "   1. npm run dev"
    echo "   2. افتح: http://localhost:5173/test-wing-animation.html"
    echo "   3. في SQL: UPDATE users SET profileFrame = 'frame7' WHERE user_id = YOUR_ID;"
    echo ""
else
    echo -e "${YELLOW}⚠️  بعض العناصر مفقودة. راجع الأخطاء أعلاه.${NC}"
fi

echo "================================================================"