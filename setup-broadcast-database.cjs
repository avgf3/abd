const Database = require('better-sqlite3');
const path = require('path');

console.log('🚀 بدء إعداد قاعدة البيانات للـ Broadcast Room...');

try {
  // إنشاء اتصال بقاعدة البيانات
  const dbPath = path.join(__dirname, 'chat.db');
  const db = new Database(dbPath);
  
  console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

  // إنشاء جدول الغرف إذا لم يكن موجوداً
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      created_by INTEGER NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      is_broadcast BOOLEAN DEFAULT FALSE,
      host_id INTEGER,
      speakers TEXT DEFAULT '[]',
      mic_queue TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ تم إنشاء جدول الغرف بنجاح');

  // إنشاء جدول مستخدمي الغرف إذا لم يكن موجوداً
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_users (
      user_id INTEGER NOT NULL,
      room_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, room_id),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `);
  
  console.log('✅ تم إنشاء جدول مستخدمي الغرف بنجاح');

  // إضافة الأعمدة الجديدة للـ Broadcast Room إذا لم تكن موجودة
  try {
    db.exec('ALTER TABLE rooms ADD COLUMN is_broadcast BOOLEAN DEFAULT FALSE');
    console.log('✅ تم إضافة عمود is_broadcast');
  } catch (error) {
    console.log('ℹ️ عمود is_broadcast موجود بالفعل');
  }

  try {
    db.exec('ALTER TABLE rooms ADD COLUMN host_id INTEGER');
    console.log('✅ تم إضافة عمود host_id');
  } catch (error) {
    console.log('ℹ️ عمود host_id موجود بالفعل');
  }

  try {
    db.exec('ALTER TABLE rooms ADD COLUMN speakers TEXT DEFAULT "[]"');
    console.log('✅ تم إضافة عمود speakers');
  } catch (error) {
    console.log('ℹ️ عمود speakers موجود بالفعل');
  }

  try {
    db.exec('ALTER TABLE rooms ADD COLUMN mic_queue TEXT DEFAULT "[]"');
    console.log('✅ تم إضافة عمود mic_queue');
  } catch (error) {
    console.log('ℹ️ عمود mic_queue موجود بالفعل');
  }

  // إنشاء غرفة البث المباشر
  const broadcastRoom = db.prepare(`
    INSERT OR IGNORE INTO rooms (
      id, name, description, icon, created_by, is_default, is_active, 
      is_broadcast, host_id, speakers, mic_queue, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  broadcastRoom.run([
    'broadcast',
    'غرفة البث المباشر',
    'غرفة خاصة للبث المباشر مع نظام المايك',
    '',
    1, // created_by (owner)
    0, // is_default (false)
    1, // is_active (true)
    1, // is_broadcast (true)
    1, // host_id (owner)
    '[]', // speakers (empty array)
    '[]', // mic_queue (empty array)
    new Date().toISOString()
  ]);

  console.log('✅ تم إنشاء غرفة البث المباشر بنجاح');

  // التحقق من وجود الغرف
  const rooms = db.prepare('SELECT * FROM rooms').all();
  console.log('📋 الغرف الموجودة في قاعدة البيانات:');
  rooms.forEach(room => {
    console.log(`  - ${room.name} (${room.id}) - Broadcast: ${room.is_broadcast ? 'نعم' : 'لا'}`);
  });

  // إغلاق الاتصال
  db.close();
  
  console.log('🎉 تم إعداد قاعدة البيانات بنجاح!');
  console.log('✨ يمكنك الآن استخدام غرفة البث المباشر في التطبيق');

} catch (error) {
  console.error('❌ خطأ في إعداد قاعدة البيانات:', error);
  process.exit(1);
}