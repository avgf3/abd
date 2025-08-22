#!/usr/bin/env node

/**
 * سكريبت التحقق من نظام المصادقة
 * يتحقق من أن النظام يعمل بشكل صحيح
 * 
 * الاستخدام: node scripts/verify-auth.js
 */

import postgres from 'postgres';
import fs from 'fs';

async function verifyAuthSystem() {
  const client = postgres(
    process.env.DATABASE_URL || 
    'postgresql://postgres.qzehjgmawnrihmepboca:abood22333a@aws-0-eu-west-3.pooler.supabase.com:6543/postgres'
  );
  
  try {
    console.log('\n🔍 === التحقق من نظام المصادقة ===\n');
    
    let allChecksPass = true;
    
    // 1. التحقق من عدم وجود SQLite
    console.log('1️⃣ فحص ملفات SQLite...');
    const sqliteFiles = ['/workspace/chat.db', '/workspace/data.sqlite'];
    let sqliteFound = false;
    
    for (const file of sqliteFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ❌ وجد ملف SQLite: ${file}`);
        sqliteFound = true;
        allChecksPass = false;
      }
    }
    
    if (!sqliteFound) {
      console.log('   ✅ لا توجد ملفات SQLite');
    }
    
    // 2. فحص المستخدمين في قاعدة البيانات
    console.log('\n2️⃣ فحص المستخدمين...');
    const users = await client`
      SELECT id, username, user_type, role 
      FROM users 
      ORDER BY id ASC
      LIMIT 5
    `;
    
    if (users.length === 0) {
      console.log('   ℹ️ لا يوجد مستخدمون - أول مستخدم سيكون المالك');
    } else {
      console.log(`   📊 عدد المستخدمين: ${users.length}`);
      
      // التحقق من أن أول مستخدم هو المالك
      if (users[0].user_type === 'owner') {
        console.log(`   ✅ أول مستخدم (${users[0].username}) هو المالك`);
      } else {
        console.log(`   ❌ أول مستخدم ليس المالك!`);
        allChecksPass = false;
      }
      
      // عرض المستخدمين
      users.forEach((user, i) => {
        const icon = user.user_type === 'owner' ? '👑' : '👤';
        console.log(`      ${icon} ${i+1}. ${user.username} (${user.user_type})`);
      });
    }
    
    // 3. التحقق من الكود
    console.log('\n3️⃣ فحص الكود...');
    
    // قراءة ملف database-setup.ts
    const dbSetupPath = '/workspace/server/database-setup.ts';
    const dbSetupContent = fs.readFileSync(dbSetupPath, 'utf8');
    
    // البحث عن كلمات مرور ثابتة (تجاهل الدالة الفارغة)
    const hasHardcodedPassword = dbSetupContent.includes('admin123') || 
                                  dbSetupContent.includes("'Owner'");
    
    if (hasHardcodedPassword) {
      console.log('   ❌ وجدت معلومات مالك ثابتة في الكود');
      allChecksPass = false;
    } else {
      console.log('   ✅ لا توجد معلومات مالك ثابتة');
    }
    
    // 4. التحقق من databaseService
    console.log('\n4️⃣ فحص آلية تعيين المالك...');
    const dbServicePath = '/workspace/server/services/databaseService.ts';
    const dbServiceContent = fs.readFileSync(dbServicePath, 'utf8');
    
    if (dbServiceContent.includes('isFirstUser ? \'owner\'')) {
      console.log('   ✅ آلية تعيين المالك التلقائي موجودة');
    } else {
      console.log('   ❌ آلية تعيين المالك التلقائي غير موجودة');
      allChecksPass = false;
    }
    
    // النتيجة النهائية
    console.log('\n' + '='.repeat(50));
    if (allChecksPass) {
      console.log('✅ جميع الفحوصات نجحت - النظام يعمل بشكل صحيح!');
    } else {
      console.log('⚠️ بعض الفحوصات فشلت - راجع التفاصيل أعلاه');
    }
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.error('❌ خطأ في التحقق:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// تشغيل السكريبت
verifyAuthSystem();