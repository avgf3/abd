#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_section() {
  echo -e "${YELLOW}\n==============================="
  echo -e "$1"
  echo -e "===============================${NC}"
}

print_section "1. تثبيت التبعيات (npm install)"
npm install

print_section "2. فحص أخطاء TypeScript (npm run check)"
if npm run check; then
  echo -e "${GREEN}✔ لا توجد أخطاء TypeScript${NC}"
else
  echo -e "${RED}✖ هناك أخطاء TypeScript! يرجى مراجعتها أعلاه.${NC}"
fi

print_section "3. إصلاح تلقائي لمشاكل Lint/Format (eslint, prettier)"
if npx eslint . --fix; then
  echo -e "${GREEN}✔ تم إصلاح مشاكل ESLint (إن وجدت)${NC}"
else
  echo -e "${YELLOW}⚠ لم يتم العثور على ESLint أو هناك مشاكل لم تُصلح تلقائيًا${NC}"
fi

if npx prettier --write .; then
  echo -e "${GREEN}✔ تم تنسيق الكود باستخدام Prettier${NC}"
else
  echo -e "${YELLOW}⚠ لم يتم العثور على Prettier أو هناك مشاكل في التنسيق${NC}"
fi

print_section "4. بناء المشروع (npm run build)"
if npm run build; then
  echo -e "${GREEN}✔ تم بناء المشروع بنجاح${NC}"
else
  echo -e "${RED}✖ فشل في بناء المشروع! راجع الأخطاء أعلاه.${NC}"
  exit 1
fi

print_section "✅ تقرير الإصلاحات النهائي"
echo -e "${GREEN}كل شيء جاهز! إذا ظهرت أخطاء أعلاه، يرجى مراجعتها يدويًا.${NC}"