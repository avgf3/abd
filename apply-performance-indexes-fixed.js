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

    // قراءة ملف SQL المحدث
    const migrationPath = join(process.cwd(), 'migrations', 'add_performance_indexes_fixed.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // تقسيم الاستعلامات
    const queries = migrationSQL
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📊 عدد الاستعلامات المراد تنفيذها: ${queries.length}`);

    // تنفيذ كل استعلام
    let successCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n⚡ تنفيذ الاستعلام ${i + 1}/${queries.length}...`);
      
      try {
        await sql.unsafe(query);
        console.log(`✅ تم تنفيذ الاستعلام ${i + 1} بنجاح`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ المؤشر موجود بالفعل في الاستعلام ${i + 1}`);
          skippedCount++;
        } else {
          console.error(`❌ خطأ في الاستعلام ${i + 1}: ${error.message}`);
        }
      }
    }

    console.log(`\n📊 ملخص التنفيذ:`);
    console.log(`✅ نجح: ${successCount} استعلام`);
    console.log(`ℹ️ موجود مسبقاً: ${skippedCount} استعلام`);
    console.log(`❌ فشل: ${queries.length - successCount - skippedCount} استعلام`);

    // التحقق من المؤشرات المضافة
    console.log('\n📋 المؤشرات الحالية على الجداول الرئيسية:');
    
    const indexInfo = await sql`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename IN ('messages', 'users', 'rooms', 'notifications', 'friends', 'room_users')
      ORDER BY tablename, indexname
    `;
    
    // عرض المؤشرات بطريقة منظمة
    const groupedIndexes = {};
    indexInfo.forEach(idx => {
      if (!groupedIndexes[idx.tablename]) {
        groupedIndexes[idx.tablename] = [];
      }
      groupedIndexes[idx.tablename].push(idx.indexname);
    });

    for (const [table, indexes] of Object.entries(groupedIndexes)) {
      console.log(`\n📁 جدول ${table}:`);
      indexes.forEach(idx => console.log(`   - ${idx}`));
    }

    // عرض إحصائيات الجداول
    console.log('\n📈 إحصائيات الجداول:');
    
    const tableStats = await sql`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN ('messages', 'users', 'rooms', 'notifications')
      ORDER BY n_live_tup DESC
    `;
    
    console.table(tableStats.map(stat => ({
      'الجدول': stat.tablename,
      'عدد الصفوف': stat.row_count,
      'صفوف محذوفة': stat.dead_rows,
      'آخر تنظيف': stat.last_vacuum ? new Date(stat.last_vacuum).toLocaleString('ar-SA') : 'لم يتم',
      'آخر تحليل': stat.last_analyze ? new Date(stat.last_analyze).toLocaleString('ar-SA') : 'لم يتم'
    })));

    // تحليل أداء الاستعلامات الشائعة
    console.log('\n🔍 تحليل استعلام نموذجي للرسائل:');
    
    const explainResult = await sql`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM messages 
      WHERE room_id = 'general' 
        AND deleted_at IS NULL 
      ORDER BY timestamp DESC 
      LIMIT 20
    `;
    
    console.log('خطة التنفيذ:');
    explainResult.forEach(row => console.log(row['QUERY PLAN']));

    console.log('\n✨ تم تطبيق جميع مؤشرات تحسين الأداء بنجاح!');
    console.log('💡 نصائح للمتابعة:');
    console.log('   1. راقب أداء الاستعلامات باستخدام pg_stat_statements');
    console.log('   2. تأكد من تشغيل VACUUM ANALYZE بشكل دوري');
    console.log('   3. راجع slow query log للتحقق من التحسينات');

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
      console.log('\n🔌 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

// تشغيل السكريبت
applyIndexes().catch(console.error);