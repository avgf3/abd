#!/usr/bin/env node

/**
 * سكريبت إعداد قاعدة البيانات للـ Render
 * يقوم بإنشاء قاعدة بيانات مجانية وإعداد متغيرات البيئة
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🗄️ إعداد قاعدة البيانات للـ Render...\n');

// دالة لإنشاء ملف .env مؤقت
function createTempEnv() {
  const envContent = `# متغيرات البيئة للـ Render
# قم بتغيير هذه القيم حسب قاعدة البيانات الخاصة بك

# رابط قاعدة البيانات (مطلوب)
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# بيئة التشغيل
NODE_ENV=production

# منفذ الخادم
PORT=10000

# إعدادات CORS
ALLOWED_ORIGINS=https://your-app-name.onrender.com

# إعدادات الأمان
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# إعدادات الملفات
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# إعدادات Socket.io
SOCKET_CORS_ORIGIN=https://your-app-name.onrender.com
`;

  const envPath = join(__dirname, '.env.render');
  writeFileSync(envPath, envContent);
  console.log('✅ تم إنشاء ملف .env.render');
  return envPath;
}

// دالة لإنشاء دليل إعداد قاعدة البيانات
function createDatabaseGuide() {
  const guideContent = `# 🗄️ دليل إعداد قاعدة البيانات للـ Render

## 🚀 الخطوات السريعة

### 1. إنشاء قاعدة بيانات مجانية
- اذهب إلى [Neon.tech](https://neon.tech)
- سجل حساب جديد (مجاني)
- أنشئ مشروع جديد
- انسخ رابط الاتصال

### 2. إعداد متغيرات البيئة في Render
1. اذهب إلى لوحة تحكم Render
2. اختر مشروعك
3. اذهب إلى Environment
4. أضف متغير جديد:
   - **المفتاح**: \`DATABASE_URL\`
   - **القيمة**: رابط قاعدة البيانات

### 3. مثال لرابط Neon:
\`\`\`
postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/database?sslmode=require
\`\`\`

### 4. إعادة نشر التطبيق
- اذهب إلى Render Dashboard
- اضغط على "Manual Deploy"
- انتظر حتى يكتمل النشر

## 🔧 إعداد محلي للاختبار

### 1. تثبيت PostgreSQL محلياً
\`\`\`bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# قم بتحميل PostgreSQL من الموقع الرسمي
\`\`\`

### 2. إنشاء قاعدة البيانات
\`\`\`bash
# تسجيل الدخول إلى PostgreSQL
sudo -u postgres psql

# إنشاء مستخدم وقاعدة بيانات
CREATE USER chatapp WITH PASSWORD 'password123';
CREATE DATABASE chatapp OWNER chatapp;
GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatapp;
\q
\`\`\`

### 3. إعداد متغيرات البيئة المحلية
\`\`\`bash
# إنشاء ملف .env
echo "DATABASE_URL=postgresql://chatapp:password123@localhost:5432/chatapp" > .env
echo "NODE_ENV=development" >> .env
echo "PORT=3001" >> .env
\`\`\`

## 🧪 اختبار الاتصال

### 1. اختبار محلي
\`\`\`bash
npm run dev
\`\`\`

### 2. اختبار قاعدة البيانات
\`\`\`bash
node -e "
import { checkDatabaseHealth } from './server/database-adapter.js';
checkDatabaseHealth().then(healthy => {
  console.log(healthy ? '✅ قاعدة البيانات تعمل' : '❌ مشكلة في قاعدة البيانات');
});
"
\`\`\`

## 🚨 حل المشاكل الشائعة

### مشكلة: "DATABASE_URL غير محدد"
**الحل**: تأكد من إضافة متغير البيئة في Render

### مشكلة: "فشل في الاتصال بقاعدة البيانات"
**الحل**: 
1. تأكد من صحة رابط قاعدة البيانات
2. تأكد من أن قاعدة البيانات تعمل
3. تأكد من إعدادات SSL

### مشكلة: "column does not exist"
**الحل**: قم بتشغيل migrations
\`\`\`bash
npm run migrate
\`\`\`

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع سجلات Render
2. تأكد من إعدادات متغيرات البيئة
3. اختبر الاتصال محلياً أولاً

---

**بعد إعداد قاعدة البيانات، سيعمل التطبيق بشكل مثالي! 🚀**
`;

  const guidePath = join(__dirname, 'DATABASE_SETUP_GUIDE.md');
  writeFileSync(guidePath, guideContent);
  console.log('✅ تم إنشاء دليل إعداد قاعدة البيانات');
  return guidePath;
}

// دالة لإنشاء سكريبت اختبار الاتصال
function createConnectionTest() {
  const testContent = `#!/usr/bin/env node

/**
 * سكريبت اختبار اتصال قاعدة البيانات
 */

import { checkDatabaseHealth, getDatabaseStatus } from './server/database-adapter.js';

async function testConnection() {
  console.log('🔍 اختبار اتصال قاعدة البيانات...\\n');
  
  const status = getDatabaseStatus();
  console.log('📊 حالة قاعدة البيانات:');
  console.log(\`   متصلة: \${status.connected ? '✅' : '❌'}\`);
  console.log(\`   النوع: \${status.type}\`);
  console.log(\`   الرابط: \${status.url}\`);
  console.log(\`   البيئة: \${status.environment}\`);
  console.log('');
  
  const healthy = await checkDatabaseHealth();
  
  if (healthy) {
    console.log('✅ قاعدة البيانات تعمل بشكل صحيح!');
    console.log('🚀 يمكنك الآن نشر التطبيق على Render');
  } else {
    console.log('❌ مشكلة في قاعدة البيانات');
    console.log('💡 راجع دليل الإعداد: DATABASE_SETUP_GUIDE.md');
  }
}

testConnection().catch(console.error);
`;

  const testPath = join(__dirname, 'test-database-connection.js');
  writeFileSync(testPath, testContent);
  console.log('✅ تم إنشاء سكريبت اختبار الاتصال');
  return testPath;
}

// دالة لإنشاء package.json scripts
function updatePackageJson() {
  try {
    const packagePath = join(__dirname, 'package.json');
    const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
    
    // إضافة scripts جديدة
    packageContent.scripts = {
      ...packageContent.scripts,
      'test:db': 'node test-database-connection.js',
      'setup:render': 'node setup-database-render.js',
      'deploy:render': 'npm run build && npm run start'
    };
    
    writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
    console.log('✅ تم تحديث package.json');
  } catch (error) {
    console.log('⚠️ لم يتم تحديث package.json:', error.message);
  }
}

// الدالة الرئيسية
async function main() {
  try {
    console.log('🚀 بدء إعداد قاعدة البيانات للـ Render...\n');
    
    // إنشاء الملفات
    createTempEnv();
    createDatabaseGuide();
    createConnectionTest();
    updatePackageJson();
    
    console.log('\n✅ تم إعداد قاعدة البيانات بنجاح!');
    console.log('\n📋 الخطوات التالية:');
    console.log('1. اذهب إلى [Neon.tech](https://neon.tech)');
    console.log('2. أنشئ قاعدة بيانات مجانية');
    console.log('3. انسخ رابط الاتصال');
    console.log('4. أضفه إلى متغيرات البيئة في Render');
    console.log('5. أعد نشر التطبيق');
    console.log('\n📖 راجع الدليل: DATABASE_SETUP_GUIDE.md');
    console.log('🧪 اختبر الاتصال: npm run test:db');
    
  } catch (error) {
    console.error('❌ خطأ في الإعداد:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
main();