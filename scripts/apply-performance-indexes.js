#!/usr/bin/env node

/**
 * سكريبت تطبيق فهارس الأداء على قاعدة البيانات
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// قراءة ملف migration
const migrationFile = path.join(__dirname, '..', 'migrations', '0009_performance_indexes.sql');
const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

async function applyIndexes() {
  console.log('🚀 بدء تطبيق فهارس الأداء...\n');
  
  // إعداد اتصال قاعدة البيانات
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات\n');
    
    // تقسيم SQL إلى أوامر منفصلة
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 عدد الأوامر: ${commands.length}\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // استخراج اسم الفهرس من الأمر
      const indexMatch = command.match(/INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      const indexName = indexMatch ? indexMatch[1] : `Command ${i + 1}`;
      
      try {
        console.log(`⏳ تنفيذ: ${indexName}...`);
        
        const startTime = Date.now();
        await client.query(command);
        const duration = Date.now() - startTime;
        
        console.log(`  ✅ نجح (${duration}ms)\n`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⏭️  موجود مسبقاً\n`);
          skipCount++;
        } else {
          console.error(`  ❌ فشل: ${error.message}\n`);
          errorCount++;
        }
      }
    }
    
    // عرض الإحصائيات قبل وبعد
    console.log('\n📊 فحص الفهارس الموجودة...');
    
    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_indexes
      JOIN pg_stat_user_indexes ON indexname = indexrelname
      WHERE schemaname = 'public'
        AND tablename IN ('messages', 'rooms', 'users', 'room_members')
      ORDER BY tablename, indexname;
    `;
    
    const result = await client.query(indexQuery);
    
    console.log('\n📋 الفهارس الحالية:');
    console.log('─'.repeat(80));
    console.log('الجدول'.padEnd(20) + 'الفهرس'.padEnd(40) + 'الحجم');
    console.log('─'.repeat(80));
    
    result.rows.forEach(row => {
      console.log(
        row.tablename.padEnd(20) +
        row.indexname.padEnd(40) +
        row.index_size
      );
    });
    
    console.log('─'.repeat(80));
    
    // إحصائيات الجداول
    const tableStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN ('messages', 'rooms', 'users', 'room_members')
      ORDER BY tablename;
    `;
    
    const tableStats = await client.query(tableStatsQuery);
    
    console.log('\n📊 إحصائيات الجداول:');
    console.log('─'.repeat(80));
    console.log('الجدول'.padEnd(20) + 'الصفوف الحية'.padEnd(15) + 'الصفوف الميتة'.padEnd(15) + 'آخر تحليل');
    console.log('─'.repeat(80));
    
    tableStats.rows.forEach(row => {
      console.log(
        row.tablename.padEnd(20) +
        String(row.live_rows || 0).padEnd(15) +
        String(row.dead_rows || 0).padEnd(15) +
        (row.last_autoanalyze ? new Date(row.last_autoanalyze).toLocaleDateString() : 'لم يتم')
      );
    });
    
    console.log('─'.repeat(80));
    
    // ملخص النتائج
    console.log('\n' + '='.repeat(60));
    console.log('📈 ملخص التطبيق:');
    console.log('='.repeat(60));
    console.log(`  ✅ نجح: ${successCount}`);
    console.log(`  ⏭️  موجود مسبقاً: ${skipCount}`);
    console.log(`  ❌ فشل: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (errorCount === 0) {
      console.log('\n🎉 تم تطبيق جميع الفهارس بنجاح!');
    } else {
      console.log('\n⚠️  تم التطبيق مع بعض الأخطاء');
    }
    
  } catch (error) {
    console.error('❌ خطأ في تطبيق الفهارس:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 تم قطع الاتصال بقاعدة البيانات');
  }
}

// تشغيل السكريبت
applyIndexes().catch(error => {
  console.error('💥 خطأ غير متوقع:', error);
  process.exit(1);
});