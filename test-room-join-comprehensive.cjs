const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres'
});

async function testRoomJoinComprehensive() {
  try {
    await client.connect();
    console.log('🔍 اختبار شامل لمشكلة الانضمام للغرف...');
    
    // 1. فحص الغرف الموجودة
    console.log('\n1️⃣ فحص الغرف الموجودة:');
    const roomsResult = await client.query('SELECT * FROM rooms WHERE is_active = true ORDER BY is_default DESC, created_at ASC LIMIT 10');
    console.log(`📋 عدد الغرف النشطة: ${roomsResult.rows.length}`);
    roomsResult.rows.forEach(room => {
      console.log(`  - ${room.id}: ${room.name} (افتراضية: ${room.is_default}, نوع: ${room.type || 'عادية'})`);
    });
    
    // 2. فحص المستخدمين المتصلين
    console.log('\n2️⃣ فحص المستخدمين المتصلين:');
    const onlineUsersResult = await client.query('SELECT id, username, is_online FROM users WHERE is_online = true ORDER BY created_at DESC LIMIT 5');
    console.log(`👥 عدد المستخدمين المتصلين: ${onlineUsersResult.rows.length}`);
    onlineUsersResult.rows.forEach(user => {
      console.log(`  - ${user.id}: ${user.username}`);
    });
    
    // 3. فحص انضمامات الغرف الحالية
    console.log('\n3️⃣ فحص انضمامات الغرف الحالية:');
    const roomUsersResult = await client.query(`
      SELECT ru.*, u.username, r.name as room_name 
      FROM room_users ru 
      JOIN users u ON ru.user_id = u.id 
      JOIN rooms r ON ru.room_id = r.id 
      ORDER BY ru.joined_at DESC 
      LIMIT 10
    `);
    console.log(`🔗 عدد انضمامات الغرف: ${roomUsersResult.rows.length}`);
    roomUsersResult.rows.forEach(ru => {
      console.log(`  - ${ru.username} انضم لـ ${ru.room_name} في ${ru.joined_at}`);
    });
    
    // 4. اختبار الانضمام لغرفة جديدة
    console.log('\n4️⃣ اختبار الانضمام لغرفة جديدة:');
    if (onlineUsersResult.rows.length > 0 && roomsResult.rows.length > 0) {
      const testUser = onlineUsersResult.rows[0];
      const testRoom = roomsResult.rows[0];
      
      console.log(`🔄 محاولة انضمام ${testUser.username} لـ ${testRoom.name}...`);
      
      // التحقق من وجود انضمام سابق
      const existingJoin = await client.query(
        'SELECT * FROM room_users WHERE user_id = $1 AND room_id = $2',
        [testUser.id, testRoom.id]
      );
      
      if (existingJoin.rows.length > 0) {
        console.log('ℹ️ المستخدم موجود بالفعل في الغرفة');
      } else {
        try {
          await client.query(
            'INSERT INTO room_users (user_id, room_id, joined_at) VALUES ($1, $2, NOW())',
            [testUser.id, testRoom.id]
          );
          console.log('✅ تم الانضمام بنجاح!');
        } catch (error) {
          console.error('❌ خطأ في الانضمام:', error.message);
        }
      }
    }
    
    // 5. اختبار API endpoint
    console.log('\n5️⃣ اختبار API endpoint للانضمام:');
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3000/api/rooms/general/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: onlineUsersResult.rows[0]?.id || 1 })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API endpoint يعمل:', data);
      } else {
        console.error('❌ خطأ في API endpoint:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ خطأ في اختبار API:', error.message);
    }
    
    // 6. فحص هيكل جدول room_users
    console.log('\n6️⃣ فحص هيكل جدول room_users:');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'room_users' 
      ORDER BY ordinal_position
    `);
    console.log('📋 هيكل جدول room_users:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 7. فحص القيود (constraints)
    console.log('\n7️⃣ فحص قيود جدول room_users:');
    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'room_users'::regclass
    `);
    console.log('🔒 قيود الجدول:');
    constraints.rows.forEach(constraint => {
      console.log(`  - ${constraint.conname}: ${constraint.definition}`);
    });
    
    await client.end();
    console.log('\n✅ انتهى الاختبار الشامل');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار الشامل:', error.message);
    if (client) await client.end();
  }
}

testRoomJoinComprehensive();