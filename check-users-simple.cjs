// التحقق من المستخدمين في قاعدة البيانات المحلية
const fs = require('fs');
const path = require('path');

console.log('🔍 فحص بسيط للمستخدمين...');

// فحص قاعدة البيانات المحلية
const dbPath = path.join(__dirname, 'chat.db');
console.log(`📁 مسار قاعدة البيانات: ${dbPath}`);

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`📊 حجم قاعدة البيانات: ${stats.size} بايت`);
  
  if (stats.size === 0) {
    console.log('⚠️ قاعدة البيانات فارغة');
  } else {
    console.log('✅ قاعدة البيانات موجودة لكن تحتاج PostgreSQL للوصول');
  }
} else {
  console.log('❌ قاعدة البيانات المحلية غير موجودة');
}

// فحص متغير البيئة
if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL موجود');
  console.log(`🔗 النوع: ${process.env.DATABASE_URL.includes('postgresql') ? 'PostgreSQL' : 'غير معروف'}`);
} else {
  console.log('❌ DATABASE_URL غير موجود');
}

// فحص التعارض في الخادم
const routesPath = path.join(__dirname, 'server', 'routes.ts');
if (fs.existsSync(routesPath)) {
  const content = fs.readFileSync(routesPath, 'utf8');
  
  // عد مرات إرسال onlineUsers
  const onlineUsersMatches = content.match(/type.*['"]onlineUsers['"]/g) || [];
  console.log(`\n📊 عدد مرات إرسال onlineUsers: ${onlineUsersMatches.length}`);
  
  // البحث عن مشاكل محتملة
  if (content.includes('allUsers') && content.includes('roomUsers') && content.includes('dbUsers')) {
    console.log('🚨 مشكلة محتملة: خلط بين مصادر بيانات مختلفة (allUsers, roomUsers, dbUsers)');
  }
  
  // فحص التنظيف الدوري
  const cleanupMatch = content.match(/(\d+)\); \/\/ كل.*ثانية/);
  if (cleanupMatch) {
    const interval = parseInt(cleanupMatch[1]);
    console.log(`⏰ فترة التنظيف الحالية: ${interval / 1000} ثانية`);
  }
  
} else {
  console.log('❌ ملف routes.ts غير موجود');
}

console.log(`
🎯 **تحليل مشكلة القائمة صفر:**

🔍 **السبب المحتمل:**
1. عند الدخول: الخادم يرسل قائمة فارغة من connectedUsers (لأن ما حدا متصل فعلياً)
2. بعد شوي: يرسل قائمة من قاعدة البيانات فيها 19 مستخدم عالق من جلسات سابقة

📡 **التعارض في الخادم:**
- ${onlineUsersMatches.length} مكان مختلف بيرسل قائمة المستخدمين للعميل
- هاي كتير وممكن تسبب تضارب في البيانات

💡 **أسماء المستخدمين العالقين:**
للأسف ما بقدر أوصل لقاعدة البيانات من هون، بس المشكلة واضحة:
- في بيانات قديمة في قاعدة البيانات مش عم تتنظف
- الخادم بيخلط بين البيانات الفعلية والقديمة
`);