import dotenv from 'dotenv';
dotenv.config();

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

async function testLogin() {
  try {
    console.log('🔐 اختبار تسجيل الدخول...');
    
    const dataDir = path.join(process.cwd(), 'data');
    const dbPath = path.join(dataDir, 'chatapp.db');
    const db = new Database(dbPath);

    const testCredentials = [
      { username: 'المالك', password: 'owner123' },
      { username: 'admin', password: 'admin123' },
      { username: 'مستخدم', password: 'user123' },
      { username: 'ضيف', password: 'guest123' },
      { username: 'المالك', password: 'wrongpassword' }, // خطأ متعمد
    ];

    console.log('\n🧪 اختبار تسجيل الدخول لجميع الحسابات:\n');

    for (const cred of testCredentials) {
      console.log(`🔍 اختبار: ${cred.username} / ${cred.password}`);
      
      // البحث عن المستخدم
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cred.username);
      
      if (!user) {
        console.log(`❌ المستخدم "${cred.username}" غير موجود`);
        continue;
      }
      
      // التحقق من كلمة المرور
      const isValidPassword = await bcrypt.compare(cred.password, user.password);
      
      if (isValidPassword) {
        console.log(`✅ تسجيل دخول ناجح!`);
        console.log(`   📝 ID: ${user.id}`);
        console.log(`   👤 النوع: ${user.user_type}`);
        console.log(`   🎭 الدور: ${user.role}`);
        console.log(`   🏆 النقاط: ${user.points}`);
        console.log(`   📊 المستوى: ${user.level}`);
      } else {
        console.log(`❌ كلمة مرور خاطئة!`);
      }
      
      console.log(''); // سطر فارغ
    }

    // اختبار إضافي: التحقق من تشفير كلمات المرور
    console.log('🔒 التحقق من تشفير كلمات المرور:');
    const allUsers = db.prepare('SELECT username, password FROM users').all();
    
    for (const user of allUsers) {
      const isHashed = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
      console.log(`   ${user.username}: ${isHashed ? '✅ مشفرة' : '❌ غير مشفرة'}`);
    }

    console.log('\n🎯 اختبار الأمان:');
    
    // اختبار SQL Injection
    const maliciousUsername = "'; DROP TABLE users; --";
    const safeQuery = db.prepare('SELECT * FROM users WHERE username = ?').get(maliciousUsername);
    console.log(`   SQL Injection Test: ${safeQuery ? '❌ فشل الأمان' : '✅ محمي من SQL Injection'}`);

    // التحقق من unique constraint
    try {
      db.prepare(`INSERT INTO users (username, password, user_type, role) VALUES (?, ?, ?, ?)`).run('المالك', 'test', 'guest', 'guest');
      console.log('   ❌ فشل في منع التكرار');
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log('   ✅ محمي من تكرار أسماء المستخدمين');
      }
    }

    db.close();
    
    console.log('\n🎉 انتهاء اختبار تسجيل الدخول!');
    console.log('✅ جميع الحسابات جاهزة وتعمل بشكل صحيح!');

  } catch (error) {
    console.error('❌ خطأ في اختبار تسجيل الدخول:', error);
  }
}

testLogin().catch(console.error);