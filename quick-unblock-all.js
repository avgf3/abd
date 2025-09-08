// سكريپت سريع لإلغاء حظر جميع المحظورين
const { Client } = require('pg');
require('dotenv').config();

async function unblockAllUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔌 الاتصال بقاعدة البيانات...');
    await client.connect();
    
    console.log('🔍 البحث عن المستخدمين المحظورين...');
    
    // جلب المستخدمين المحظورين
    const blockedResult = await client.query('SELECT id, username FROM users WHERE is_blocked = true');
    const blockedUsers = blockedResult.rows;
    
    if (blockedUsers.length === 0) {
      console.log('✅ لا يوجد مستخدمين محظورين');
      return;
    }
    
    console.log(`📋 تم العثور على ${blockedUsers.length} مستخدم محظور:`);
    blockedUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (ID: ${user.id})`);
    });
    
    console.log('\n🔓 بدء إلغاء الحظر...');
    
    // إلغاء حظر جميع المستخدمين
    const unblockResult = await client.query(`
      UPDATE users 
      SET is_blocked = false, 
          ip_address = NULL, 
          device_id = NULL 
      WHERE is_blocked = true
    `);
    
    console.log(`✅ تم إلغاء حظر ${unblockResult.rowCount} مستخدم`);
    
    // تنظيف جدول الأجهزة المحجوبة
    console.log('🧹 تنظيف الأجهزة المحجوبة...');
    const blockedDevicesResult = await client.query('DELETE FROM blocked_devices');
    console.log(`✅ تم تنظيف ${blockedDevicesResult.rowCount} جهاز محجوب`);
    
    // التحقق النهائي
    const checkResult = await client.query('SELECT COUNT(*) as count FROM users WHERE is_blocked = true');
    const remainingBlocked = parseInt(checkResult.rows[0].count);
    
    if (remainingBlocked === 0) {
      console.log('\n🎉 تم إلغاء حظر جميع المستخدمين بنجاح!');
      console.log('✨ لا يوجد مستخدمين محظورين في قاعدة البيانات');
    } else {
      console.log(`\n⚠️  لا يزال هناك ${remainingBlocked} مستخدم محظور`);
    }
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await client.end();
    console.log('🔚 تم إنهاء الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريپت
unblockAllUsers()
  .then(() => {
    console.log('\n✅ انتهى السكريپت');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ خطأ في تشغيل السكريپت:', error);
    process.exit(1);
  });