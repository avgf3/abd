const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres'
});

async function testRoomsIssue() {
  try {
    await client.connect();
    console.log('🔍 فحص مشكلة الانضمام للغرف...');
    
    // 1. فحص الغرف الموجودة
    console.log('\n1️⃣ فحص الغرف الموجودة:');
    const roomsResult = await client.query('SELECT * FROM rooms ORDER BY created_at DESC LIMIT 5');
    console.log(`📋 عدد الغرف: ${roomsResult.rows.length}`);
    roomsResult.rows.forEach(room => {
      console.log(`  - ${room.id}: ${room.name} (نشطة: ${room.is_active}, نوع: ${room.type})`);
    });
    
    // 2. فحص المستخدمين
    console.log('\n2️⃣ فحص المستخدمين:');
    const usersResult = await client.query('SELECT id, username, is_online FROM users ORDER BY created_at DESC LIMIT 5');
    console.log(`👥 عدد المستخدمين: ${usersResult.rows.length}`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.id}: ${user.username} (متصل: ${user.is_online})`);
    });
    
    // 3. فحص انضمامات الغرف
    console.log('\n3️⃣ فحص انضمامات الغرف:');
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
    
    // 4. اختبار انضمام مستخدم لغرفة
    console.log('\n4️⃣ اختبار انضمام مستخدم لغرفة:');
    if (usersResult.rows.length > 0 && roomsResult.rows.length > 0) {
      const testUser = usersResult.rows[0];
      const testRoom = roomsResult.rows[0];
      
      console.log(`🔄 محاولة انضمام ${testUser.username} لـ ${testRoom.name}...`);
      
      try {
        await client.query(
          'INSERT INTO room_users (user_id, room_id, joined_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, room_id) DO UPDATE SET joined_at = NOW()',
          [testUser.id, testRoom.id]
        );
        console.log('✅ تم الانضمام بنجاح!');
      } catch (error) {
        console.error('❌ خطأ في الانضمام:', error.message);
      }
    }
    
    await client.end();
    console.log('\n✅ انتهى الاختبار');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    if (client) await client.end();
  }
}

testRoomsIssue();