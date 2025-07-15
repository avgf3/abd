#!/bin/bash

# سكريبت فحص تلقائي لمتطلبات وتشغيل مشروع الدردشة

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. فحص متغيرات البيئة المطلوبة
REQUIRED_VARS=("DATABASE_URL")
MISSING=0

echo -e "${YELLOW}--- فحص متغيرات البيئة ---${NC}"
for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR}" ]]; then
    echo -e "${RED}❌ متغير البيئة $VAR غير مضبوط!${NC}"
    MISSING=1
  else
    echo -e "${GREEN}✔ متغير البيئة $VAR مضبوط.${NC}"
  fi
done

if [[ $MISSING -eq 1 ]]; then
  echo -e "${RED}يرجى ضبط متغيرات البيئة الناقصة ثم إعادة المحاولة.${NC}"
  exit 1
fi

echo -e "${YELLOW}--- فحص تثبيت الحزم ---${NC}"
npm install --silent
if [[ $? -ne 0 ]]; then
  echo -e "${RED}❌ فشل في تثبيت الحزم.${NC}"
  exit 1
else
  echo -e "${GREEN}✔ تم تثبيت الحزم بنجاح.${NC}"
fi

echo -e "${YELLOW}--- بناء المشروع ---${NC}"
npm run build --silent
if [[ $? -ne 0 ]]; then
  echo -e "${RED}❌ فشل في بناء المشروع.${NC}"
  exit 1
else
  echo -e "${GREEN}✔ تم بناء المشروع بنجاح.${NC}"
fi

echo -e "${YELLOW}--- تشغيل السيرفر في الخلفية ---${NC}"
nohup npm run start > server.log 2>&1 &
SERVER_PID=$!
sleep 3

# فحص إذا السيرفر يعمل على المنفذ 5000
curl -s http://localhost:5000 > /dev/null
if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}✔ السيرفر يعمل على http://localhost:5000${NC}"
else
  echo -e "${RED}❌ السيرفر لا يعمل أو لم يبدأ بعد.${NC}"
  echo -e "${YELLOW}--- آخر 20 سطر من سجل السيرفر ---${NC}"
  tail -20 server.log
  kill $SERVER_PID
  exit 1
fi

echo -e "${GREEN}✅ كل شيء يعمل بشكل سليم!${NC}"