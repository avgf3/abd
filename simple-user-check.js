const fs = require('fs');
const path = require('path');

console.log('🔍 فحص بسيط لمشكلة المستخدمين المعلقين...');

// محاولة قراءة قاعدة البيانات المحلية
const dbPath = path.join(__dirname, 'chat.db');

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`📁 حجم قاعدة البيانات: ${stats.size} بايت`);
  
  if (stats.size === 0) {
    console.log('⚠️ قاعدة البيانات فارغة - هذا قد يكون سبب المشكلة');
  }
} else {
  console.log('❌ لم يتم العثور على قاعدة البيانات المحلية');
}

// فحص ملفات الخادم للبحث عن connectedUsers
const serverPath = path.join(__dirname, 'server', 'routes.ts');
if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // البحث عن تعريف connectedUsers
  const connectedUsersMatch = content.match(/const connectedUsers = new Map<number, {[\s\S]*?}>\(\);/);
  if (connectedUsersMatch) {
    console.log('✅ تم العثور على تعريف connectedUsers في الخادم');
  }
  
  // البحث عن فترة التنظيف
  const cleanupMatch = content.match(/}, (\d+)\); \/\/ كل دقيقتين/);
  if (cleanupMatch) {
    const interval = parseInt(cleanupMatch[1]);
    console.log(`⏰ فترة التنظيف الحالية: ${interval / 1000} ثانية (${interval / 60000} دقيقة)`);
    
    if (interval >= 120000) {
      console.log('🚨 المشكلة المحتملة: فترة التنظيف طويلة جداً!');
      console.log('💡 يجب تقليل فترة التنظيف إلى 30-60 ثانية لحل مشكلة المستخدمين المعلقين');
    }
  }
  
  // البحث عن عدد مرات استخدام connectedUsers
  const usageCount = (content.match(/connectedUsers\./g) || []).length;
  console.log(`📊 استخدام connectedUsers في الكود: ${usageCount} مرة`);
  
} else {
  console.log('❌ لم يتم العثور على ملف routes.ts');
}

console.log(`
🎯 تحليل مشكلة الـ 19 مستخدم المعلقين:

🔍 الأسباب المحتملة:
1. ❌ فترة التنظيف الدوري طويلة جداً (120 ثانية)
2. ❌ عدم إزالة المستخدمين فوراً عند انقطاع الاتصال
3. ❌ تضارب بين connectedUsers و قاعدة البيانات
4. ❌ عدم تنظيف Socket connections المنقطعة

💡 الحلول المقترحة:
1. تقليل فترة التنظيف من 120 ثانية إلى 30 ثانية
2. إضافة تنظيف فوري عند انقطاع الاتصال
3. تحسين آلية التحقق من صحة الاتصالات
4. إضافة heartbeat أسرع للكشف عن الاتصالات المنقطعة
`);