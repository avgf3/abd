const Database = require('better-sqlite3');
const path = require('path');

// اختبار قاعدة البيانات
console.log('🧪 بدء اختبار غرفة البث المباشر...');

try {
  // الاتصال بقاعدة البيانات
  const dbPath = path.join(__dirname, 'chat.db');
  const db = new Database(dbPath);
  
  console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
  
  // التحقق من وجود جدول الغرف
  const roomsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'");
  const roomsExists = roomsTable.get();
  
  if (roomsExists) {
    console.log('✅ جدول الغرف موجود');
    
    // التحقق من وجود غرفة البث المباشر
    const broadcastRoom = db.prepare("SELECT * FROM rooms WHERE id = 'broadcast'");
    const room = broadcastRoom.get();
    
    if (room) {
      console.log('✅ غرفة البث المباشر موجودة');
      console.log('📋 تفاصيل الغرفة:');
      console.log(`  - الاسم: ${room.name}`);
      console.log(`  - الوصف: ${room.description}`);
      console.log(`  - البث المباشر: ${room.is_broadcast ? 'نعم' : 'لا'}`);
      console.log(`  - المضيف: ${room.host_id}`);
      console.log(`  - المتحدثون: ${room.speakers}`);
      console.log(`  - قائمة الانتظار: ${room.mic_queue}`);
    } else {
      console.log('❌ غرفة البث المباشر غير موجودة');
    }
    
    // عرض جميع الغرف
    const allRooms = db.prepare("SELECT id, name, is_broadcast FROM rooms");
    const rooms = allRooms.all();
    
    console.log('\n📋 جميع الغرف الموجودة:');
    rooms.forEach(room => {
      console.log(`  - ${room.name} (${room.id}) - Broadcast: ${room.is_broadcast ? 'نعم' : 'لا'}`);
    });
    
  } else {
    console.log('❌ جدول الغرف غير موجود');
  }
  
  // التحقق من الأعمدة الجديدة
  const columns = db.prepare("PRAGMA table_info(rooms)");
  const tableInfo = columns.all();
  
  console.log('\n🔍 أعمدة جدول الغرف:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  db.close();
  console.log('\n✅ تم إغلاق قاعدة البيانات بنجاح');
  
} catch (error) {
  console.error('❌ خطأ في اختبار قاعدة البيانات:', error);
}