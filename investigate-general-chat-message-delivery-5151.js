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
    
    // 1. فحص الجداول الموجودة
    console.log('\n1️⃣ فحص الجداول الموجودة:');
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 الجداول الموجودة:', tablesCheck.rows.map(r => r.table_name));
    
    // 2. فحص جدول الرسائل إذا كان موجوداً
    console.log('\n2️⃣ فحص جدول الرسائل:');
    try {
      const messagesCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE room_id = 'general') as general_messages
        FROM messages
      `);
      
      console.log('📈 إحصائيات الرسائل:', messagesCheck.rows[0]);
    } catch (error) {
      console.log('⚠️ جدول messages غير موجود أو له هيكل مختلف');
    }
    
    // 3. فحص جدول المستخدمين
    console.log('\n3️⃣ فحص جدول المستخدمين:');
    try {
      const usersCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_online = true) as online_users
        FROM users
      `);
      
      console.log('👥 إحصائيات المستخدمين:', usersCheck.rows[0]);
    } catch (error) {
      console.log('⚠️ جدول users غير موجود أو له هيكل مختلف');
    }
    
    // 4. فحص هيكل الجداول
    console.log('\n4️⃣ فحص هيكل الجداول:');
    for (const table of tablesCheck.rows) {
      const tableName = table.table_name;
      try {
        const structureCheck = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `);
        
        console.log(`📋 هيكل جدول ${tableName}:`, structureCheck.rows.map(r => `${r.column_name} (${r.data_type})`));
      } catch (error) {
        console.log(`❌ خطأ في فحص هيكل جدول ${tableName}:`, error.message);
      }
    }
    
    // 5. فحص البيانات الفعلية
    console.log('\n5️⃣ فحص البيانات الفعلية:');
    for (const table of tablesCheck.rows) {
      const tableName = table.table_name;
      try {
        const dataCheck = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`📊 عدد الصفوف في ${tableName}:`, dataCheck.rows[0].count);
        
        if (dataCheck.rows[0].count > 0) {
          const sampleCheck = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
          console.log(`📝 عينة من ${tableName}:`, Object.keys(sampleCheck.rows[0]));
        }
      } catch (error) {
        console.log(`❌ خطأ في فحص بيانات ${tableName}:`, error.message);
      }
    }
    
    // 6. فحص مشاكل الاتصال
    console.log('\n6️⃣ فحص مشاكل الاتصال:');
    try {
      const connectionCheck = await pool.query(`
        SELECT 
          COUNT(*) as total_connections
        FROM user_connections
      `);
      
      console.log('🔌 إحصائيات الاتصالات:', connectionCheck.rows[0]);
    } catch (error) {
      console.log('⚠️ جدول user_connections غير موجود');
    }
    
    // 7. توصيات الإصلاح
    console.log('\n7️⃣ توصيات الإصلاح:');
    
    const tableNames = tablesCheck.rows.map(r => r.table_name);
    
    if (!tableNames.includes('messages')) {
      console.log('⚠️ جدول messages مفقود - يجب إنشاؤه');
    }
    
    if (!tableNames.includes('users')) {
      console.log('⚠️ جدول users مفقود - يجب إنشاؤه');
    }
    
    if (!tableNames.includes('rooms')) {
      console.log('⚠️ جدول rooms مفقود - يجب إنشاؤه');
    }
    
    console.log('\n✅ فحص مشاكل إرسال الرسائل مكتمل!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ خطأ في فحص قاعدة البيانات:', error);
  }
}

// تشغيل الفحص
investigateChatMessageDelivery().catch(console.error);