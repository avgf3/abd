// سكريپت مباشر لإلغاء حظر جميع المحظورين
import { createConnection } from 'net';

const DATABASE_URL = 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';

// تحليل رابط قاعدة البيانات
function parsePostgresUrl(url) {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('رابط قاعدة البيانات غير صحيح');
  }
  
  return {
    user: match[1],
    password: match[2], 
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  };
}

async function executeSQL() {
  console.log('🚀 تنفيذ أوامر SQL مباشرة...');
  
  const dbConfig = parsePostgresUrl(DATABASE_URL);
  console.log(`🔌 الاتصال بـ: ${dbConfig.host}:${dbConfig.port}`);
  
  // أوامر SQL لإلغاء الحظر
  const sqlCommands = [
    "SELECT COUNT(*) as blocked_count FROM users WHERE is_blocked = true;",
    "UPDATE users SET is_blocked = false, ip_address = NULL, device_id = NULL WHERE is_blocked = true;", 
    "DELETE FROM blocked_devices;",
    "SELECT COUNT(*) as remaining_blocked FROM users WHERE is_blocked = true;"
  ];
  
  console.log('\n📋 أوامر SQL التي سيتم تنفيذها:');
  sqlCommands.forEach((cmd, i) => {
    console.log(`${i + 1}. ${cmd}`);
  });
  
  console.log('\n💡 لتنفيذ هذه الأوامر يدوياً:');
  console.log('1. اذهب إلى لوحة تحكم Supabase');
  console.log('2. افتح SQL Editor');
  console.log('3. انسخ والصق الأوامر التالية:\n');
  
  console.log('-- عرض عدد المحظورين');
  console.log('SELECT id, username, user_type FROM users WHERE is_blocked = true;');
  console.log('');
  console.log('-- إلغاء حظر جميع المستخدمين');
  console.log('UPDATE users SET is_blocked = false, ip_address = NULL, device_id = NULL WHERE is_blocked = true;');
  console.log('');
  console.log('-- تنظيف الأجهزة المحجوبة');
  console.log('DELETE FROM blocked_devices;');
  console.log('');
  console.log('-- التحقق النهائي');
  console.log('SELECT COUNT(*) as remaining_blocked FROM users WHERE is_blocked = true;');
  
  return true;
}

// تشغيل السكريپت
executeSQL()
  .then(() => {
    console.log('\n✅ تم عرض الأوامر المطلوبة');
    console.log('🔗 رابط لوحة التحكم: https://supabase.com/dashboard/project/qzehjgmawnrihmepboca/sql');
  })
  .catch((error) => {
    console.error('❌ خطأ:', error.message);
  });