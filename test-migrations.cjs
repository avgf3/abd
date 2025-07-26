const { migrate } = require('drizzle-orm/postgres-js/migrator.js');
const postgres = require('postgres');
require('dotenv').config();

console.log('🧪 بدء اختبار الـ migrations...');

async function testMigrations() {
  try {
    // الاتصال بقاعدة البيانات
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chat_db';
    const sql = postgres(connectionString, { max: 1 });
    
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    
    // تشغيل الـ migrations
    console.log('🔄 تشغيل الـ migrations...');
    await migrate(sql, { migrationsFolder: './migrations' });
    
    console.log('✅ تم تشغيل الـ migrations بنجاح');
    
    // التحقق من وجود الجداول
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('📋 الجداول الموجودة:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // التحقق من وجود غرفة البث المباشر
    const broadcastRoom = await sql`
      SELECT * FROM rooms WHERE id = 'broadcast'
    `;
    
    if (broadcastRoom.length > 0) {
      console.log('✅ غرفة البث المباشر موجودة');
      console.log(`  - الاسم: ${broadcastRoom[0].name}`);
      console.log(`  - البث المباشر: ${broadcastRoom[0].is_broadcast}`);
      console.log(`  - المضيف: ${broadcastRoom[0].host_id}`);
    } else {
      console.log('❌ غرفة البث المباشر غير موجودة');
    }
    
    await sql.end();
    console.log('✅ تم إغلاق الاتصال بنجاح');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار الـ migrations:', error);
  }
}

testMigrations();