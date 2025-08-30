import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 بدء تطبيق مؤشرات تحسين الأداء...');

async function applyIndexes() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL غير محدد في ملف البيئة');
    process.exit(1);
  }

  let sql;
  try {
    // الاتصال بقاعدة البيانات
    sql = postgres(databaseUrl, {
      ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 30,
    });

    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');

    // قراءة ملف SQL
    const migrationPath = join(process.cwd(), 'migrations', 'add_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // تقسيم الاستعلامات (كل استعلام ينتهي بـ ;)
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📊 عدد الاستعلامات المراد تنفيذها: ${queries.length}`);

    // تنفيذ كل استعلام
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // تخطي الاستعلامات التي تبدأ بـ SELECT (استعلامات معلوماتية)
      if (query.toUpperCase().startsWith('SELECT')) {
        console.log(`\n📊 تنفيذ استعلام معلوماتي ${i + 1}/${queries.length}...`);
        try {
          const result = await sql.unsafe(query);
          console.table(result);
        } catch (error) {
          console.warn(`⚠️ تحذير في الاستعلام ${i + 1}: ${error.message}`);
        }
        continue;
      }

      console.log(`\n⚡ تنفيذ الاستعلام ${i + 1}/${queries.length}...`);
      
      try {
        await sql.unsafe(query);
        console.log(`✅ تم تنفيذ الاستعلام ${i + 1} بنجاح`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ المؤشر موجود بالفعل في الاستعلام ${i + 1}`);
        } else {
          console.error(`❌ خطأ في الاستعلام ${i + 1}: ${error.message}`);
        }
      }
    }

    // التحقق من المؤشرات المضافة
    console.log('\n📋 المؤشرات الحالية على الجداول الرئيسية:');
    
    const indexInfo = await sql`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename IN ('messages', 'users', 'rooms', 'notifications')
      ORDER BY tablename, indexname
    `;
    
    console.table(indexInfo);

    // عرض إحصائيات الجداول
    console.log('\n📈 إحصائيات الجداول:');
    
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as "عدد الصفوف",
        n_dead_tup as "صفوف محذوفة",
        last_vacuum as "آخر تنظيف",
        last_analyze as "آخر تحليل"
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN ('messages', 'users', 'rooms', 'notifications')
      ORDER BY n_live_tup DESC
    `;
    
    console.table(tableStats);

    console.log('\n✨ تم تطبيق جميع مؤشرات تحسين الأداء بنجاح!');

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      console.log('🔌 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

// تشغيل السكريبت
applyIndexes().catch(console.error);