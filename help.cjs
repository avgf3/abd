#!/usr/bin/env node

console.log(`
🚀 دليل سكريبتات المشروع العربي
==================================

📦 سكريبتات NPM المتاحة:
------------------------

🔧 التطوير:
• npm run dev          - تشغيل الخادم في وضع التطوير
• npm run check        - فحص TypeScript للأخطاء

🏗️ البناء والنشر:
• npm run build        - بناء المشروع للإنتاج (شامل)
• npm run build:simple - بناء بسيط للإنتاج
• npm run test:build   - اختبار البناء محلياً

🚀 التشغيل:
• npm start           - تشغيل المشروع في وضع الإنتاج

📤 رفع الملفات:
• npm run push        - رفع الملفات لـ Git (تفاعلي)
• npm run push:quick  - رفع سريع بـ Bash

🗄️ قاعدة البيانات:
• npm run db:push     - رفع schema لقاعدة البيانات

📂 سكريبتات مباشرة:
--------------------

🐍 Node.js Scripts:
• node push.cjs       - سكريبت رفع تفاعلي
• node deploy.cjs     - سكريبت نشر شامل
• node test-build.cjs - اختبار البناء
• node help.cjs       - هذا الدليل

🐚 Bash Scripts:
• ./push.sh          - رفع ملفات بـ Bash
• chmod +x *.sh      - جعل الـ scripts قابلة للتنفيذ

📚 دلائل المساعدة:
------------------

📖 الملفات المفيدة:
• HOW_TO_PUSH.md      - دليل رفع الملفات
• RENDER_DEPLOY.md    - دليل النشر على Render
• DEPLOYMENT_GUIDE.md - دليل النشر الشامل
• FIXES_IMPLEMENTED.md - ملخص الإصلاحات

🎯 للبدء السريع:
-----------------

1️⃣ للتطوير المحلي:
   npm run dev

2️⃣ لرفع الملفات:
   npm run push

3️⃣ لاختبار البناء:
   npm run test:build

4️⃣ للنشر على Render:
   راجع RENDER_DEPLOY.md

🆘 للمساعدة:
-------------
• npm run help       - عرض هذا الدليل
• cat HOW_TO_PUSH.md - دليل رفع الملفات
• cat RENDER_DEPLOY.md - دليل النشر

✨ نصائح سريعة:
• استخدم npm run push للرفع السريع
• استخدم npm run test:build قبل النشر
• راجع .env.example لإعداد البيئة

🎉 المشروع جاهز للاستخدام والنشر!
`);

// إضافة معلومات حالة المشروع
const fs = require('fs');
const path = require('path');

console.log('\n🔍 حالة المشروع:');
console.log('================');

// فحص الملفات المهمة
const importantFiles = [
  'package.json',
  '.env.example', 
  'vite.config.ts',
  'server/index.ts',
  'client/index.html'
];

importantFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - مفقود!`);
  }
});

// فحص مجلدات مهمة
const importantDirs = [
  'server/',
  'client/',
  'shared/',
  'server/routes/'
];

console.log('\n📁 المجلدات:');
importantDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}`);
  } else {
    console.log(`❌ ${dir} - مفقود!`);
  }
});

console.log('\n🚀 كل شيء جاهز للعمل!');