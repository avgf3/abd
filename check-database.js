const { Pool } = require('@neondatabase/serverless');

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    console.log('💡 Set it with: export DATABASE_URL="your-database-url"');
    process.exit(1);
  }

  console.log('🔍 فحص حالة قاعدة البيانات...');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // فحص جدول المستخدمين
    console.log('\n📊 فحص جدول المستخدمين...');
    
    // فحص الأعمدة الموجودة
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name='users'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 الأعمدة الموجودة في جدول users:');
    let hasRoleColumn = false;
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
      if (col.column_name === 'role') {
        hasRoleColumn = true;
      }
    });

    if (!hasRoleColumn) {
      console.log('\n❌ عمود "role" مفقود! هذا سبب المشكلة');
    } else {
      console.log('\n✅ عمود "role" موجود');
    }

    // فحص المستخدمين الموجودين
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 عدد المستخدمين في قاعدة البيانات: ${userCount.rows[0].count}`);

    if (userCount.rows[0].count > 0) {
      console.log('\n📊 عينة من المستخدمين:');
      const users = await pool.query('SELECT id, username, user_type, password FROM users LIMIT 5');
      users.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, اسم المستخدم: ${user.username}, النوع: ${user.user_type}, كلمة المرور: ${user.password ? '***' : 'NULL'}`);
      });
    }

    // اختبار الاتصال بقاعدة البيانات
    await pool.query('SELECT NOW()');
    console.log('\n✅ الاتصال بقاعدة البيانات يعمل بشكل صحيح');

  } catch (error) {
    console.error('\n❌ خطأ في فحص قاعدة البيانات:', error);
    console.log('\n💡 تأكد من:');
    console.log('  1. DATABASE_URL صحيح');
    console.log('  2. قاعدة البيانات متاحة');
    console.log('  3. لديك صلاحيات الوصول');
  } finally {
    await pool.end();
  }
}

// تشغيل الفحص
checkDatabase().catch(console.error);