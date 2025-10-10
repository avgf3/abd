#!/usr/bin/env node
/*
  Quick verification script to ensure required columns for walls and VIP/rich view exist
  and that username colors are sane. Safe to run multiple times.
*/
import 'dotenv/config';
import { dbAdapter, initializeDatabase } from './server/database-adapter.js';

async function main() {
  const ok = await initializeDatabase();
  if (!ok || !dbAdapter.client) {
    console.error('Database not connected. Set DATABASE_URL and try again.');
    process.exit(1);
  }
  const sql = dbAdapter.client;

  const checks = [
    {
      name: 'users.username_gradient',
      query: `SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username_gradient'`,
    },
    {
      name: 'users.username_effect',
      query: `SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username_effect'`,
    },
    {
      name: 'wall_posts.username_gradient',
      query: `SELECT 1 FROM information_schema.columns WHERE table_name='wall_posts' AND column_name='username_gradient'`,
    },
    {
      name: 'wall_posts.username_effect',
      query: `SELECT 1 FROM information_schema.columns WHERE table_name='wall_posts' AND column_name='username_effect'`,
    },
    {
      name: 'wall_posts.user_profile_frame',
      query: `SELECT 1 FROM information_schema.columns WHERE table_name='wall_posts' AND column_name='user_profile_frame'`,
    },
    {
      name: 'vip_users table',
      query: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vip_users'`,
    },
  ];

  const results = [];
  for (const c of checks) {
    try {
      const rows = await sql.unsafe(c.query);
      const exists = Array.isArray(rows) ? rows.length > 0 : !!rows?.[0];
      results.push({ name: c.name, ok: exists });
    } catch (e) {
      results.push({ name: c.name, ok: false, error: String(e?.message || e) });
    }
  }

  // Sample counts after backfill
  let invalidWallColors = 0;
  try {
    const rows = await sql.unsafe(`SELECT COUNT(*)::int AS c FROM wall_posts WHERE username_color IS NULL OR username_color='' OR username_color='null' OR username_color='undefined' OR LOWER(username_color) IN ('#ffffff','#fff','white')`);
    invalidWallColors = Number(rows?.[0]?.c || 0);
  } catch {}

  console.log('Verification results:');
  for (const r of results) {
    console.log(`- ${r.ok ? '✅' : '❌'} ${r.name}${r.error ? ' - ' + r.error : ''}`);
  }
  console.log(`- Invalid wall_posts.username_color after backfill: ${invalidWallColors}`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('❌ DATABASE_URL غير محدد - لا يمكن التحقق من قاعدة البيانات');
  process.exit(1);
}

console.log('🔍 التحقق من إصلاح قاعدة البيانات...');

async function verifyDatabaseFix() {
  const sql = postgres(DATABASE_URL);
  
  try {
    // Check database connection
    console.log('📡 اختبار الاتصال بقاعدة البيانات...');
    await sql`SELECT 1`;
    console.log('✅ الاتصال بقاعدة البيانات ناجح');

    // Check if rooms table exists
    console.log('🏠 التحقق من وجود جدول rooms...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'rooms'
      ) as exists
    `;
    
    if (!tableExists[0].exists) {
      console.log('❌ جدول rooms غير موجود');
      return false;
    }
    console.log('✅ جدول rooms موجود');

    // Check for chat_lock columns
    console.log('🔒 التحقق من أعمدة chat_lock...');
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      AND column_name IN ('chat_lock_all', 'chat_lock_visitors')
      ORDER BY column_name
    `;
    
    console.log('📊 الأعمدة الموجودة:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
    });

    if (columns.length !== 2) {
      console.log('❌ أعمدة chat_lock مفقودة!');
      console.log('المطلوب: chat_lock_all, chat_lock_visitors');
      console.log('الموجود:', columns.map(c => c.column_name));
      return false;
    }

    // Test a simple rooms query
    console.log('🔍 اختبار استعلام rooms...');
    try {
      const testQuery = await sql`
        SELECT id, name, chat_lock_all, chat_lock_visitors
        FROM rooms 
        WHERE deleted_at IS NULL 
        LIMIT 3
      `;
      console.log(`✅ استعلام rooms ناجح - تم العثور على ${testQuery.length} غرف`);
      
      if (testQuery.length > 0) {
        console.log('📝 عينة من البيانات:');
        testQuery.forEach(room => {
          console.log(`  - ${room.name || room.id}: chat_lock_all=${room.chat_lock_all}, chat_lock_visitors=${room.chat_lock_visitors}`);
        });
      }
    } catch (queryError) {
      console.log('❌ فشل في استعلام rooms:', queryError.message);
      return false;
    }

    // Check indexes
    console.log('📇 التحقق من الفهارس...');
    const indexes = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'rooms' 
      AND indexname LIKE '%chat_lock%'
    `;
    
    console.log('🗂️ فهارس chat_lock:', indexes.map(i => i.indexname));

    console.log('🎉 تم التحقق من إصلاح قاعدة البيانات بنجاح!');
    console.log('✅ جميع الأعمدة المطلوبة موجودة ويمكن الوصول إليها');
    
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في التحقق من قاعدة البيانات:', error);
    return false;
  } finally {
    await sql.end();
  }
}

// Run verification
verifyDatabaseFix()
  .then(success => {
    if (success) {
      console.log('🚀 قاعدة البيانات جاهزة للنشر!');
      process.exit(0);
    } else {
      console.log('⚠️ قد تحتاج قاعدة البيانات إلى إصلاحات إضافية');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ فشل التحقق:', error);
    process.exit(1);
  });