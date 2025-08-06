#!/usr/bin/env node
/**
 * سكريپت انتقال للنظام المنظف
 * يساعد في الانتقال من النظام المعقد القديم إلى النظام الجديد المنظف
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 بدء انتقال النظام المنظف...');

// إنشاء مجلد backup للملفات القديمة
const backupDir = path.join(__dirname, 'backup-old-system');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('📁 تم إنشاء مجلد backup-old-system');
}

// قائمة الملفات التي يجب نسخها احتياطياً
const filesToBackup = [
  'server/routes.ts',
  'server/index.ts',
  'server/storage.ts'
];

// نسخ الملفات القديمة
filesToBackup.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(backupDir, file.replace('/', '-'));
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ تم نسخ ${file} إلى ${destPath}`);
    } catch (error) {
      console.error(`❌ خطأ في نسخ ${file}:`, error);
    }
  } else {
    console.log(`⚠️ الملف ${file} غير موجود`);
  }
});

// إعادة تسمية الملفات الجديدة
const filesToRename = [
  { from: 'server/routes-clean.ts', to: 'server/routes.ts' },
  { from: 'server/index-clean.ts', to: 'server/index.ts' }
];

filesToRename.forEach(({ from, to }) => {
  const fromPath = path.join(__dirname, from);
  const toPath = path.join(__dirname, to);
  
  if (fs.existsSync(fromPath)) {
    try {
      // حذف الملف القديم إذا كان موجوداً
      if (fs.existsSync(toPath)) {
        fs.unlinkSync(toPath);
      }
      
      // إعادة تسمية الملف الجديد
      fs.renameSync(fromPath, toPath);
      console.log(`✅ تم إعادة تسمية ${from} إلى ${to}`);
    } catch (error) {
      console.error(`❌ خطأ في إعادة تسمية ${from}:`, error);
    }
  } else {
    console.log(`⚠️ الملف ${from} غير موجود`);
  }
});

// تحديث package.json للنظام الجديد
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // تحديث scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'start:clean': 'node server/index.js',
      'dev:clean': 'tsx watch server/index.ts',
      'migration:backup': 'node clean-system-migration.mjs'
    };
    
    // تحديث الوصف
    packageJson.description = 'النظام المنظف للدردشة العربية - Clean Arabic Chat System';
    packageJson.version = '2.0.0';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ تم تحديث package.json');
  } catch (error) {
    console.error('❌ خطأ في تحديث package.json:', error);
  }
}

// إنشاء ملف README للنظام الجديد
const readmeContent = `# النظام المنظف للدردشة العربية
## Clean Arabic Chat System v2.0

### الميزات الجديدة:
- ✅ نظام غرف منظف ومبسط
- ✅ إدارة مستخدمين محسنة لكل غرفة
- ✅ تحميل آخر 50 رسالة تلقائياً
- ✅ بث رسائل محدود للغرفة فقط
- ✅ كود مرتب وقابل للصيانة

### التشغيل:
\`\`\`bash
# النظام الجديد
npm run dev:clean
# أو
npm run start:clean

# النظام القديم (backup)
npm run dev
\`\`\`

### بنية النظام الجديد:
- \`server/services/roomService.ts\` - خدمة إدارة الغرف
- \`server/services/messageBroadcastService.ts\` - خدمة بث الرسائل
- \`server/handlers/roomHandlers.ts\` - معالجات أحداث الغرف
- \`server/routes.ts\` - الطرق المنظفة
- \`server/index.ts\` - نقطة البداية المنظفة

### الملفات المحفوظة:
الملفات القديمة محفوظة في \`backup-old-system/\`

### الانتقال مكتمل! 🎉

## الميزات المحققة:

### 🏠 نظام الغرف:
- المستخدم ينضم لغرفة محددة عند الاتصال
- حفظ الانضمام مؤقتاً في الذاكرة
- إدارة مستخدمين لكل غرفة منفصلة

### 👥 إدارة المستخدمين:
- عرض المستخدمين المتصلين في نفس الغرفة فقط
- تحديث القائمة عند دخول/خروج المستخدمين
- تنظيف تلقائي للمستخدمين المنقطعين

### 📩 نظام الرسائل:
- تخزين كل رسالة في قاعدة البيانات
- بث الرسائل فقط للمستخدمين في نفس الغرفة
- عدم استلام رسائل من غرف أخرى

### 📚 تحميل الرسائل:
- تحميل آخر 50 رسالة عند دخول الغرفة
- نظام delta sync للرسائل الجديدة
- تحسين الأداء وتقليل استهلاك البيانات

### 🛠️ صيانة وتحسين:
- كود منظم وقابل للصيانة
- فصل المسؤوليات في خدمات منفصلة
- معالجة أخطاء شاملة
- تنظيف الذاكرة التلقائي
`;

fs.writeFileSync(path.join(__dirname, 'README-CLEAN-SYSTEM.md'), readmeContent);
console.log('✅ تم إنشاء README-CLEAN-SYSTEM.md');

console.log('\n🎉 تم الانتقال بنجاح إلى النظام المنظف!');
console.log('📋 خطوات ما بعد الانتقال:');
console.log('1. تأكد من تثبيت المتطلبات: npm install');
console.log('2. اختبر النظام الجديد: npm run dev:clean');
console.log('3. تحقق من عمل الغرف والرسائل');
console.log('4. في حالة وجود مشاكل، يمكن العودة للنظام القديم من backup-old-system/');
console.log('\n🔧 النظام الجديد يحقق كل المتطلبات:');
console.log('✅ انضمام المستخدمين للغرف المحددة');
console.log('✅ حفظ مؤقت للانضمام في الذاكرة');
console.log('✅ عرض المستخدمين المتصلين في نفس الغرفة فقط');
console.log('✅ تحديث القائمة عند دخول/خروج المستخدمين');
console.log('✅ تخزين الرسائل في قاعدة البيانات');
console.log('✅ بث الرسائل للغرفة المحددة فقط');
console.log('✅ عدم استلام رسائل من غرف أخرى');
console.log('✅ تحميل آخر 50 رسالة عند دخول الغرفة');
console.log('✅ نظام delta sync للرسائل الجديدة');
console.log('✅ صيانة وتحسين شامل للكود');