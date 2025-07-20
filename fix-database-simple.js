const { Pool } = require('@neondatabase/serverless');

async function fixDatabaseSimple() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    console.log('💡 قم بتعيينه: export DATABASE_URL="your-database-url"');
    process.exit(1);
  }

  console.log('🔧 بدء إصلاح قاعدة البيانات...');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // الخطوة 1: فحص وجود عمود role
    console.log('🔍 فحص وجود عمود role...');
    const checkRole = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='role'
    `);

    if (checkRole.rows.length === 0) {
      console.log('⚡ إضافة عمود role...');
      
      // إضافة العمود بطريقة آمنة
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN role TEXT DEFAULT 'guest'
      `);
      
      console.log('✅ تم إضافة عمود role بنجاح');
      
      // تحديث القيم الموجودة
      console.log('🔄 تحديث القيم الموجودة...');
      await pool.query(`
        UPDATE users 
        SET role = CASE 
          WHEN user_type IS NOT NULL THEN user_type 
          ELSE 'guest' 
        END
        WHERE role IS NULL OR role = ''
      `);
      
      console.log('✅ تم تحديث القيم بنجاح');
      
    } else {
      console.log('✅ عمود role موجود بالفعل');
    }

    // إضافة القيود إذا لم تكن موجودة
    console.log('🔒 إضافة القيود المطلوبة...');
    try {
      await pool.query(`
        ALTER TABLE users 
        ALTER COLUMN role SET NOT NULL
      `);
      console.log('✅ تم تعيين عمود role كمطلوب');
    } catch (err) {
      if (err.code !== '23502') { // ignore if already NOT NULL
        console.log('⚠️  عمود role كان مطلوباً بالفعل');
      }
    }

    // التحقق من النتيجة النهائية
    console.log('\n🔍 التحقق من النتيجة...');
    const finalCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='role'
    `);

    if (finalCheck.rows.length > 0) {
      const col = finalCheck.rows[0];
      console.log(`✅ عمود role: نوع=${col.data_type}, مطلوب=${col.is_nullable === 'NO'}`);
    }

    // فحص عينة من المستخدمين
    const users = await pool.query(`
      SELECT id, username, user_type, role 
      FROM users 
      LIMIT 3
    `);

    console.log('\n📊 عينة من المستخدمين بعد الإصلاح:');
    users.rows.forEach(user => {
      console.log(`  - ${user.username}: type=${user.user_type}, role=${user.role}`);
    });

    console.log('\n🎉 تم إصلاح قاعدة البيانات بنجاح!');
    console.log('\n🧪 يمكنك الآن اختبار تسجيل دخول الأعضاء');

  } catch (error) {
    console.error('\n❌ خطأ في الإصلاح:', error);
    console.log('\n📞 تفاصيل الخطأ:');
    console.log(`   - الكود: ${error.code}`);
    console.log(`   - الرسالة: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// تشغيل الإصلاح
fixDatabaseSimple().catch(console.error);