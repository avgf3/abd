const postgres = require('postgres');
require('dotenv').config();

console.log('🧪 بدء اختبار قاعدة البيانات...');

async function testDatabase() {
  try {
    // الاتصال بقاعدة البيانات
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/chat_db';
    const sql = postgres(connectionString, { max: 1 });
    
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    
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
    
    // التحقق من وجود جدول الغرف
    const roomsTable = tables.find(t => t.table_name === 'rooms');
    if (roomsTable) {
      console.log('✅ جدول الغرف موجود');
      
      // التحقق من أعمدة جدول الغرف
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'rooms'
        ORDER BY ordinal_position
      `;
      
      console.log('🔍 أعمدة جدول الغرف:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
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
        console.log(`  - المتحدثون: ${broadcastRoom[0].speakers}`);
        console.log(`  - قائمة الانتظار: ${broadcastRoom[0].mic_queue}`);
      } else {
        console.log('❌ غرفة البث المباشر غير موجودة');
        
        // إنشاء غرفة البث المباشر
        console.log('🔄 إنشاء غرفة البث المباشر...');
        await sql`
          INSERT INTO rooms (id, name, description, icon, created_by, is_default, is_active, is_broadcast, host_id, speakers, mic_queue)
          VALUES ('broadcast', 'غرفة البث المباشر', 'غرفة خاصة للبث المباشر مع نظام المايك', '', 1, false, true, true, 1, '[]', '[]')
          ON CONFLICT (id) DO NOTHING
        `;
        console.log('✅ تم إنشاء غرفة البث المباشر');
      }
      
    } else {
      console.log('❌ جدول الغرف غير موجود');
    }
    
    await sql.end();
    console.log('✅ تم إغلاق الاتصال بنجاح');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار قاعدة البيانات:', error);
  }
}

testDatabase();