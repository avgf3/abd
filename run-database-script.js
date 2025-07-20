import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

/**
 * سكريبت تنفيذ قاعدة البيانات الشامل
 * Comprehensive Database Setup Script
 */

async function runDatabaseScript() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير موجود في متغيرات البيئة');
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  console.log('🔄 الاتصال بقاعدة البيانات...');
  console.log('🔄 Connecting to database...');
  
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // قراءة ملف SQL
    const sqlFilePath = path.join(process.cwd(), 'database-script.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ ملف database-script.sql غير موجود');
      console.error('❌ database-script.sql file not found');
      process.exit(1);
    }

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 تنفيذ سكريبت قاعدة البيانات...');
    console.log('📋 Executing database script...');
    
    // تقسيم السكريبت إلى عدة أوامر
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.length === 0) continue;
      
      try {
        await pool.query(command);
        successCount++;
        
        if (command.includes('CREATE TABLE')) {
          const tableName = command.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
          console.log(`✅ تم إنشاء جدول: ${tableName}`);
          console.log(`✅ Table created: ${tableName}`);
        } else if (command.includes('CREATE INDEX')) {
          const indexName = command.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i)?.[1];
          console.log(`📊 تم إنشاء فهرس: ${indexName}`);
          console.log(`📊 Index created: ${indexName}`);
        } else if (command.includes('INSERT INTO')) {
          console.log('➕ تم إدراج بيانات افتراضية');
          console.log('➕ Default data inserted');
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ خطأ في تنفيذ الأمر: ${command.substring(0, 50)}...`);
        console.error(`❌ Error executing command: ${command.substring(0, 50)}...`);
        console.error(`   السبب: ${error.message}`);
        console.error(`   Reason: ${error.message}`);
      }
    }

    console.log('\n📊 ملخص التنفيذ / Execution Summary:');
    console.log(`✅ الأوامر الناجحة / Successful commands: ${successCount}`);
    console.log(`❌ الأوامر الفاشلة / Failed commands: ${errorCount}`);

    // التحقق من هيكل قاعدة البيانات
    console.log('\n🔍 التحقق من هيكل قاعدة البيانات...');
    console.log('🔍 Verifying database structure...');
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📋 الجداول الموجودة / Existing tables:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // فحص المستخدمين
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 عدد المستخدمين في قاعدة البيانات: ${userCount.rows[0].count}`);
    console.log(`👥 Total users in database: ${userCount.rows[0].count}`);

    // عرض عينة من المستخدمين
    const sampleUsers = await pool.query(`
      SELECT id, username, user_type, role, created_at 
      FROM users 
      ORDER BY created_at 
      LIMIT 5
    `);

    if (sampleUsers.rows.length > 0) {
      console.log('\n👤 عينة من المستخدمين / Sample users:');
      sampleUsers.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, اسم المستخدم: ${user.username}, النوع: ${user.user_type}, الدور: ${user.role}`);
      });
    }

    // فحص الفهارس
    const indexes = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    if (indexes.rows.length > 0) {
      console.log('\n📊 الفهارس المخصصة / Custom indexes:');
      indexes.rows.forEach(index => {
        console.log(`  - ${index.indexname} على جدول ${index.tablename}`);
      });
    }

    console.log('\n✅ تم تنفيذ سكريبت قاعدة البيانات بنجاح!');
    console.log('✅ Database script executed successfully!');
    
  } catch (error) {
    console.error('❌ خطأ في تنفيذ سكريبت قاعدة البيانات:');
    console.error('❌ Error executing database script:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل السكريبت
console.log('🚀 بدء تنفيذ سكريبت قاعدة البيانات...');
console.log('🚀 Starting database script execution...');

runDatabaseScript().catch(console.error);