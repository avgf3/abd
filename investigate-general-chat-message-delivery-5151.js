import dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';

async function investigateChatMessageDelivery() {
  console.log('🔍 بدء فحص مشاكل إرسال الرسائل في الدردشة العامة...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return;
  }

  try {
    const pool = new Pool({ connectionString: databaseUrl });
    
    console.log('📊 فحص قاعدة البيانات...');
    
    // 1. فحص جدول الرسائل
    console.log('\n1️⃣ فحص جدول الرسائل:');
    const messagesCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE room_id = 'general') as general_messages,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_messages,
        COUNT(*) FILTER (WHERE user_id IS NULL) as messages_without_user
      FROM messages
    `);
    
    console.log('📈 إحصائيات الرسائل:', messagesCheck.rows[0]);
    
    // 2. فحص المستخدمين النشطين
    console.log('\n2️⃣ فحص المستخدمين النشطين:');
    const activeUsersCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '1 hour') as active_users,
        COUNT(*) FILTER (WHERE is_online = true) as online_users
      FROM users
    `);
    
    console.log('👥 إحصائيات المستخدمين:', activeUsersCheck.rows[0]);
    
    // 3. فحص الغرف
    console.log('\n3️⃣ فحص الغرف:');
    const roomsCheck = await pool.query(`
      SELECT 
        room_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_message
      FROM messages 
      WHERE room_id = 'general'
      GROUP BY room_id
    `);
    
    console.log('🏠 إحصائيات غرفة الدردشة العامة:', roomsCheck.rows);
    
    // 4. فحص مشاكل الاتصال
    console.log('\n4️⃣ فحص مشاكل الاتصال:');
    const connectionIssues = await pool.query(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE connected_at > NOW() - INTERVAL '1 hour') as recent_connections
      FROM user_connections
    `);
    
    console.log('🔌 إحصائيات الاتصالات:', connectionIssues.rows);
    
    // 5. فحص الأخطاء الأخيرة
    console.log('\n5️⃣ فحص الأخطاء الأخيرة:');
    const recentErrors = await pool.query(`
      SELECT 
        error_type,
        COUNT(*) as error_count,
        MAX(created_at) as last_error
      FROM error_logs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY error_type
      ORDER BY error_count DESC
      LIMIT 5
    `);
    
    console.log('❌ الأخطاء الأخيرة:', recentErrors.rows);
    
    // 6. فحص أداء قاعدة البيانات
    console.log('\n6️⃣ فحص أداء قاعدة البيانات:');
    const performanceCheck = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
      LIMIT 5
    `);
    
    console.log('⚡ أداء قاعدة البيانات:', performanceCheck.rows);
    
    // 7. توصيات الإصلاح
    console.log('\n7️⃣ توصيات الإصلاح:');
    
    const generalMessages = messagesCheck.rows[0].general_messages;
    const activeUsers = activeUsersCheck.rows[0].active_users;
    
    if (generalMessages === 0) {
      console.log('⚠️ لا توجد رسائل في الدردشة العامة - تحقق من:');
      console.log('   - إعدادات Socket.IO');
      console.log('   - اتصال قاعدة البيانات');
      console.log('   - صلاحيات المستخدمين');
    }
    
    if (activeUsers === 0) {
      console.log('⚠️ لا يوجد مستخدمين نشطين - تحقق من:');
      console.log('   - نظام تسجيل الدخول');
      console.log('   - تحديث last_seen');
      console.log('   - إعدادات الجلسات');
    }
    
    console.log('\n✅ فحص مشاكل إرسال الرسائل مكتمل!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ خطأ في فحص قاعدة البيانات:', error);
  }
}

// تشغيل الفحص
investigateChatMessageDelivery().catch(console.error);