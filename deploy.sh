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

print_section "1. تثبيت التبعيات (npm install --legacy-peer-deps)"
npm install --legacy-peer-deps

print_section "2. تجهيز ملف البيئة (.env)"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✔ تم إنشاء ملف .env من .env.example${NC}"
    echo -e "${YELLOW}⚠️  عدل قيم DATABASE_URL و SESSION_SECRET في .env قبل التشغيل!${NC}"
  else
    echo -e "${RED}✖ لا يوجد .env أو .env.example! أضف ملف البيئة يدوياً.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✔ ملف .env موجود${NC}"
fi

print_section "3. تجهيز قاعدة البيانات (drizzle-kit push)"
if npx drizzle-kit push; then
  echo -e "${GREEN}✔ تم تجهيز قاعدة البيانات${NC}"
else
  echo -e "${RED}✖ فشل في تجهيز قاعدة البيانات! راجع الإعدادات.${NC}"
  exit 1
fi

print_section "4. بناء المشروع (npm run build:only)"
if npm run build:only; then
  echo -e "${GREEN}✔ تم بناء المشروع بنجاح${NC}"
else
  echo -e "${RED}✖ فشل في بناء المشروع! راجع الأخطاء أعلاه.${NC}"
  exit 1
fi

print_section "5. تشغيل المشروع في وضع الإنتاج (npm start)"
echo -e "${YELLOW}سيتم تشغيل المشروع على المنفذ 5000 (أو حسب متغير PORT)${NC}"
npm start