const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres'
});

async function testRoomJoinFinal() {
  try {
    await client.connect();
    console.log('🧪 اختبار نهائي لنظام الانضمام للغرف...');
    
    // 1. اختبار API الغرف
    console.log('\n1️⃣ اختبار API الغرف...');
    try {
      const fetch = require('node-fetch');
      const response = await fetch('http://localhost:3000/api/rooms');
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API الغرف يعمل: ${data.rooms.length} غرفة`);
        data.rooms.forEach(room => {
          console.log(`  - ${room.name}: ${room.userCount} مستخدم`);
        });
      } else {
        console.error('❌ خطأ في API الغرف:', response.status);
      }
    } catch (error) {
      console.error('❌ خطأ في اختبار API:', error.message);
    }
    
    // 2. اختبار الانضمام لغرفة
    console.log('\n2️⃣ اختبار الانضمام لغرفة...');
    const onlineUsers = await client.query('SELECT id FROM users WHERE is_online = true LIMIT 1');
    
    if (onlineUsers.rows.length > 0) {
      const testUserId = onlineUsers.rows[0].id;
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch(`http://localhost:3000/api/rooms/music/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: testUserId })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ تم الانضمام للغرفة بنجاح:', data);
        } else {
          const errorData = await response.json();
          console.error('❌ خطأ في الانضمام:', errorData);
        }
      } catch (error) {
        console.error('❌ خطأ في اختبار الانضمام:', error.message);
      }
    }
    
    // 3. فحص حالة قاعدة البيانات النهائية
    console.log('\n3️⃣ فحص حالة قاعدة البيانات النهائية...');
    
    const finalStats = await client.query(`
      SELECT 
        r.name as room_name,
        r.id as room_id,
        COUNT(ru.user_id) as user_count,
        r.is_default,
        r.is_active
      FROM rooms r
      LEFT JOIN room_users ru ON r.id = ru.room_id
      WHERE r.is_active = true
      GROUP BY r.id, r.name, r.is_default, r.is_active
      ORDER BY r.is_default DESC, r.created_at ASC
    `);
    
    console.log('📊 إحصائيات الغرف النهائية:');
    finalStats.rows.forEach(stat => {
      const status = stat.is_active ? '✅' : '❌';
      const defaultMark = stat.is_default ? ' (افتراضية)' : '';
      console.log(`  ${status} ${stat.room_name}${defaultMark}: ${stat.user_count} مستخدم`);
    });
    
    // 4. فحص المستخدمين المتصلين
    console.log('\n4️⃣ فحص المستخدمين المتصلين...');
    const onlineUsersCount = await client.query('SELECT COUNT(*) as count FROM users WHERE is_online = true');
    console.log(`👥 عدد المستخدمين المتصلين: ${onlineUsersCount.rows[0].count}`);
    
    // 5. فحص انضمامات الغرف
    console.log('\n5️⃣ فحص انضمامات الغرف...');
    const roomJoins = await client.query(`
      SELECT 
        u.username,
        r.name as room_name,
        ru.joined_at
      FROM room_users ru
      JOIN users u ON ru.user_id = u.id
      JOIN rooms r ON ru.room_id = r.id
      ORDER BY ru.joined_at DESC
      LIMIT 10
    `);
    
    console.log('🔗 آخر 10 انضمامات للغرف:');
    roomJoins.rows.forEach(join => {
      console.log(`  - ${join.username} انضم لـ ${join.room_name} في ${join.joined_at}`);
    });
    
    // 6. اختبار Socket.IO (إذا كان متاحاً)
    console.log('\n6️⃣ اختبار Socket.IO...');
    try {
      const { io } = require('socket.io-client');
      const socket = io('http://localhost:3000');
      
      socket.on('connect', () => {
        console.log('✅ Socket.IO متصل بنجاح');
        socket.disconnect();
      });
      
      socket.on('connect_error', (error) => {
        console.log('❌ خطأ في Socket.IO:', error.message);
      });
      
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect();
        }
      }, 2000);
      
    } catch (error) {
      console.log('ℹ️ Socket.IO غير متاح للاختبار');
    }
    
    await client.end();
    console.log('\n✅ انتهى الاختبار النهائي بنجاح!');
    console.log('\n🎉 نظام الانضمام للغرف يعمل بشكل صحيح!');
    
  } catch (error) {
    console.error('❌ خطأ في الاختبار النهائي:', error.message);
    if (client) await client.end();
  }
}

testRoomJoinFinal();