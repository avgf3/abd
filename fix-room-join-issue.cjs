const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres'
});

async function fixRoomJoinIssue() {
  try {
    await client.connect();
    console.log('🔧 بدء إصلاح مشكلة الانضمام للغرف...');
    
    // 1. إنشاء الغرفة العامة إذا لم تكن موجودة
    console.log('\n1️⃣ التأكد من وجود الغرفة العامة...');
    const generalRoom = await client.query('SELECT * FROM rooms WHERE id = $1', ['general']);
    
    if (generalRoom.rows.length === 0) {
      console.log('➕ إنشاء الغرفة العامة...');
      await client.query(`
        INSERT INTO rooms (id, name, description, is_default, is_active, created_by, created_at, is_broadcast, host_id, speakers, mic_queue)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
      `, [
        'general',
        'الدردشة العامة',
        'الغرفة الرئيسية للدردشة',
        true,
        true,
        1,
        false,
        null,
        '[]',
        '[]'
      ]);
      console.log('✅ تم إنشاء الغرفة العامة');
    } else {
      console.log('✅ الغرفة العامة موجودة بالفعل');
    }
    
    // 2. إنشاء غرف افتراضية أخرى إذا لم تكن موجودة
    console.log('\n2️⃣ التأكد من وجود الغرف الافتراضية...');
    const defaultRooms = [
      {
        id: 'music',
        name: 'أغاني وسهر',
        description: 'غرفة للموسيقى والترفيه',
        isBroadcast: false
      },
      {
        id: 'broadcast',
        name: 'غرفة البث المباشر',
        description: 'غرفة خاصة للبث المباشر مع نظام المايك',
        isBroadcast: true,
        hostId: 1
      }
    ];
    
    for (const room of defaultRooms) {
      const existingRoom = await client.query('SELECT * FROM rooms WHERE id = $1', [room.id]);
      
      if (existingRoom.rows.length === 0) {
        console.log(`➕ إنشاء غرفة ${room.name}...`);
        await client.query(`
          INSERT INTO rooms (id, name, description, is_default, is_active, created_by, created_at, is_broadcast, host_id, speakers, mic_queue)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
        `, [
          room.id,
          room.name,
          room.description,
          false,
          true,
          1,
          room.isBroadcast,
          room.hostId || null,
          '[]',
          '[]'
        ]);
        console.log(`✅ تم إنشاء غرفة ${room.name}`);
      } else {
        console.log(`✅ غرفة ${room.name} موجودة بالفعل`);
      }
    }
    
    // 3. إضافة جميع المستخدمين المتصلين للغرفة العامة
    console.log('\n3️⃣ إضافة المستخدمين المتصلين للغرفة العامة...');
    const onlineUsers = await client.query('SELECT id FROM users WHERE is_online = true');
    console.log(`👥 عدد المستخدمين المتصلين: ${onlineUsers.rows.length}`);
    
    for (const user of onlineUsers.rows) {
      // التحقق من وجود انضمام سابق
      const existingJoin = await client.query(
        'SELECT * FROM room_users WHERE user_id = $1 AND room_id = $2',
        [user.id, 'general']
      );
      
      if (existingJoin.rows.length === 0) {
        console.log(`➕ إضافة المستخدم ${user.id} للغرفة العامة...`);
        await client.query(
          'INSERT INTO room_users (user_id, room_id, joined_at) VALUES ($1, $2, NOW())',
          [user.id, 'general']
        );
      } else {
        console.log(`ℹ️ المستخدم ${user.id} موجود بالفعل في الغرفة العامة`);
      }
    }
    
    // 4. تحديث عدد المستخدمين في كل غرفة
    console.log('\n4️⃣ تحديث عدد المستخدمين في الغرف...');
    const rooms = await client.query('SELECT id FROM rooms WHERE is_active = true');
    
    for (const room of rooms.rows) {
      const userCount = await client.query(
        'SELECT COUNT(*) as count FROM room_users WHERE room_id = $1',
        [room.id]
      );
      
      console.log(`📊 غرفة ${room.id}: ${userCount.rows[0].count} مستخدم`);
    }
    
    // 5. فحص وإصلاح أي مشاكل في قاعدة البيانات
    console.log('\n5️⃣ فحص وإصلاح مشاكل قاعدة البيانات...');
    
    // حذف انضمامات مكررة
    const duplicates = await client.query(`
      DELETE FROM room_users 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM room_users 
        GROUP BY user_id, room_id
      )
    `);
    console.log(`🧹 تم حذف ${duplicates.rowCount} انضمام مكرر`);
    
    // حذف انضمامات لمستخدمين غير موجودين
    const invalidUsers = await client.query(`
      DELETE FROM room_users 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    console.log(`🧹 تم حذف ${invalidUsers.rowCount} انضمام لمستخدمين غير موجودين`);
    
    // حذف انضمامات لغرف غير موجودة
    const invalidRooms = await client.query(`
      DELETE FROM room_users 
      WHERE room_id NOT IN (SELECT id FROM rooms)
    `);
    console.log(`🧹 تم حذف ${invalidRooms.rowCount} انضمام لغرف غير موجودة`);
    
    // 6. إنشاء فهرس لتحسين الأداء
    console.log('\n6️⃣ إنشاء فهارس لتحسين الأداء...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_room_users_user_id ON room_users(user_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_room_users_user_room ON room_users(user_id, room_id)
      `);
      console.log('✅ تم إنشاء الفهارس');
    } catch (error) {
      console.log('ℹ️ الفهارس موجودة بالفعل');
    }
    
    // 7. النتيجة النهائية
    console.log('\n7️⃣ النتيجة النهائية:');
    const finalStats = await client.query(`
      SELECT 
        r.name as room_name,
        COUNT(ru.user_id) as user_count
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.is_active = true
      GROUP BY r.id, r.name
      ORDER BY r.is_default DESC, r.created_at ASC
    `);
    
    console.log('📊 إحصائيات الغرف النهائية:');
    finalStats.rows.forEach(stat => {
      console.log(`  - ${stat.room_name}: ${stat.user_count} مستخدم`);
    });
    
    await client.end();
    console.log('\n✅ تم إصلاح مشكلة الانضمام للغرف بنجاح!');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح مشكلة الانضمام للغرف:', error.message);
    if (client) await client.end();
  }
}

fixRoomJoinIssue();