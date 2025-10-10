/**
 * إصلاح سريع لإضافة أعمدة لون الاسم - CommonJS
 */

const postgres = require('postgres');

async function fixUsernameColors() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد');
    console.error('تأكد من تعيين DATABASE_URL في متغيرات البيئة');
    process.exit(1);
  }

  console.log('🎨 بدء إصلاح أعمدة لون الاسم...');
  console.log('🔗 الاتصال بقاعدة البيانات...');
  
  const sql = postgres(databaseUrl, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
    max: 1,
    onnotice: () => {} // تجاهل الإشعارات
  });

  try {
    // اختبار الاتصال
    await sql`SELECT 1 as test`;
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // فحص وإضافة أعمدة wall_posts
    console.log('\n📝 فحص جدول wall_posts...');
    
    let wallColumns;
    try {
      wallColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'wall_posts' 
        AND column_name IN ('username_color', 'username_gradient', 'username_effect')
      `;
    } catch (error) {
      console.error('❌ خطأ في فحص أعمدة wall_posts:', error.message);
      return;
    }
    
    const existingWallColumns = wallColumns.map(r => r.column_name);
    console.log('الأعمدة الموجودة في wall_posts:', existingWallColumns);
    
    // إضافة الأعمدة المفقودة في wall_posts
    const wallColumnsToAdd = [
      { name: 'username_color', type: 'TEXT DEFAULT \'#4A90E2\'' },
      { name: 'username_gradient', type: 'TEXT' },
      { name: 'username_effect', type: 'TEXT' }
    ];

    for (const column of wallColumnsToAdd) {
      if (!existingWallColumns.includes(column.name)) {
        console.log(`➕ إضافة عمود ${column.name} في wall_posts...`);
        try {
          await sql.unsafe(`ALTER TABLE "wall_posts" ADD COLUMN "${column.name}" ${column.type}`);
          console.log(`✅ تم إضافة ${column.name} بنجاح`);
        } catch (error) {
          console.error(`❌ خطأ في إضافة ${column.name}:`, error.message);
        }
      } else {
        console.log(`✅ عمود ${column.name} موجود في wall_posts`);
      }
    }

    // فحص وإضافة أعمدة stories
    console.log('\n📖 فحص جدول stories...');
    
    let storyColumns;
    try {
      storyColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        AND column_name IN ('username', 'username_color', 'username_gradient', 'username_effect')
      `;
    } catch (error) {
      console.error('❌ خطأ في فحص أعمدة stories:', error.message);
      return;
    }
    
    const existingStoryColumns = storyColumns.map(r => r.column_name);
    console.log('الأعمدة الموجودة في stories:', existingStoryColumns);
    
    // إضافة الأعمدة المفقودة في stories
    const storyColumnsToAdd = [
      { name: 'username', type: 'TEXT' },
      { name: 'username_color', type: 'TEXT DEFAULT \'#4A90E2\'' },
      { name: 'username_gradient', type: 'TEXT' },
      { name: 'username_effect', type: 'TEXT' }
    ];

    for (const column of storyColumnsToAdd) {
      if (!existingStoryColumns.includes(column.name)) {
        console.log(`➕ إضافة عمود ${column.name} في stories...`);
        try {
          await sql.unsafe(`ALTER TABLE "stories" ADD COLUMN "${column.name}" ${column.type}`);
          console.log(`✅ تم إضافة ${column.name} بنجاح`);
        } catch (error) {
          console.error(`❌ خطأ في إضافة ${column.name}:`, error.message);
        }
      } else {
        console.log(`✅ عمود ${column.name} موجود في stories`);
      }
    }

    // تحديث القيم الفارغة
    console.log('\n🔄 تحديث القيم الافتراضية...');
    
    try {
      const wallUpdateResult = await sql`
        UPDATE "wall_posts" 
        SET "username_color" = '#4A90E2' 
        WHERE "username_color" IS NULL OR "username_color" = ''
      `;
      console.log(`📝 تم تحديث ${wallUpdateResult.count || 0} سجل في wall_posts`);
    } catch (error) {
      console.log('⚠️ تحديث wall_posts:', error.message);
    }

    try {
      const storyUpdateResult = await sql`
        UPDATE "stories" 
        SET "username_color" = '#4A90E2' 
        WHERE "username_color" IS NULL OR "username_color" = ''
      `;
      console.log(`📖 تم تحديث ${storyUpdateResult.count || 0} سجل في stories`);
    } catch (error) {
      console.log('⚠️ تحديث stories:', error.message);
    }

    // اختبار الاستعلامات
    console.log('\n🧪 اختبار الاستعلامات...');
    
    try {
      const testWallQuery = await sql`
        SELECT "id", "username_color", "username_gradient", "username_effect" 
        FROM "wall_posts" 
        LIMIT 1
      `;
      console.log('✅ استعلام wall_posts يعمل بنجاح');
      if (testWallQuery.length > 0) {
        console.log('عينة من البيانات:', {
          id: testWallQuery[0].id,
          username_color: testWallQuery[0].username_color,
          username_gradient: testWallQuery[0].username_gradient,
          username_effect: testWallQuery[0].username_effect
        });
      }
    } catch (error) {
      console.error('❌ خطأ في استعلام wall_posts:', error.message);
    }
    
    try {
      const testStoryQuery = await sql`
        SELECT "id", "username", "username_color" 
        FROM "stories" 
        LIMIT 1
      `;
      console.log('✅ استعلام stories يعمل بنجاح');
      if (testStoryQuery.length > 0) {
        console.log('عينة من البيانات:', {
          id: testStoryQuery[0].id,
          username: testStoryQuery[0].username,
          username_color: testStoryQuery[0].username_color
        });
      }
    } catch (error) {
      console.error('❌ خطأ في استعلام stories:', error.message);
    }

    // فحص نهائي للأعمدة
    console.log('\n🔍 فحص نهائي للأعمدة...');
    
    const finalWallCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wall_posts' 
      AND column_name IN ('username_color', 'username_gradient', 'username_effect')
      ORDER BY column_name
    `;
    console.log('أعمدة wall_posts النهائية:', finalWallCheck.map(r => r.column_name));

    const finalStoryCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' 
      AND column_name IN ('username', 'username_color', 'username_gradient', 'username_effect')
      ORDER BY column_name
    `;
    console.log('أعمدة stories النهائية:', finalStoryCheck.map(r => r.column_name));

    console.log('\n🎉 تم إصلاح أعمدة لون الاسم بنجاح!');
    console.log('💡 يمكنك الآن إعادة تشغيل التطبيق لاختبار الإصلاحات');
    
  } catch (error) {
    console.error('❌ خطأ عام في الإصلاح:', error.message);
    console.error('تفاصيل الخطأ:', error);
    process.exit(1);
  } finally {
    try {
      await sql.end();
      console.log('🔚 تم إغلاق الاتصال بقاعدة البيانات');
    } catch (error) {
      console.error('تحذير: خطأ في إغلاق الاتصال:', error.message);
    }
  }
}

// تشغيل الإصلاح
console.log('🚀 بدء سكريبت إصلاح أعمدة لون الاسم...');
fixUsernameColors().catch((error) => {
  console.error('💥 فشل السكريبت:', error);
  process.exit(1);
});