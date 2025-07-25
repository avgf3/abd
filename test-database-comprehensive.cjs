#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

class DatabaseTester {
  constructor() {
    this.pool = null;
    this.databaseUrl = process.env.DATABASE_URL;
  }

  async init() {
    console.log('🔍 بدء اختبار قاعدة البيانات الشامل...\n');
    
    if (!this.databaseUrl) {
      console.log('❌ DATABASE_URL غير محدد في ملف .env');
      return false;
    }
    
    console.log('✅ DATABASE_URL محدد');
    console.log(`📍 الرابط: ${this.databaseUrl.replace(/:[^:]*@/, ':***@')}\n`);
    
    try {
      this.pool = new Pool({ connectionString: this.databaseUrl });
      return true;
    } catch (error) {
      console.log('❌ فشل في إنشاء اتصال pool:', error.message);
      return false;
    }
  }

  async testConnection() {
    console.log('🔗 اختبار الاتصال بقاعدة البيانات...');
    try {
      const result = await this.pool.query('SELECT 1 as test');
      console.log('✅ نجح الاتصال بقاعدة البيانات');
      return true;
    } catch (error) {
      console.log('❌ فشل الاتصال:', error.message);
      return false;
    }
  }

  async checkTables() {
    console.log('\n📋 فحص الجداول...');
    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        ORDER BY table_name
      `);
      
      const expectedTables = [
        'users', 'messages', 'friends', 'notifications', 
        'blocked_devices', 'level_settings', 'points_history'
      ];
      
      const foundTables = result.rows.map(row => row.table_name);
      console.log('📊 الجداول الموجودة:', foundTables.join(', '));
      
      const missingTables = expectedTables.filter(table => !foundTables.includes(table));
      if (missingTables.length > 0) {
        console.log('⚠️ الجداول المفقودة:', missingTables.join(', '));
        return false;
      }
      
      console.log('✅ جميع الجداول المطلوبة موجودة');
      return true;
    } catch (error) {
      console.log('❌ خطأ في فحص الجداول:', error.message);
      return false;
    }
  }

  async checkUsers() {
    console.log('\n👥 فحص المستخدمين...');
    try {
      const result = await this.pool.query(`
        SELECT id, username, user_type, role, is_online
        FROM users 
        ORDER BY id 
        LIMIT 10
      `);
      
      if (result.rows.length === 0) {
        console.log('⚠️ لا يوجد مستخدمون في قاعدة البيانات');
        return false;
      }
      
      console.log(`📊 عدد المستخدمين: ${result.rows.length}`);
      result.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, اسم: ${user.username}, نوع: ${user.user_type}, حالة: ${user.is_online ? 'متصل' : 'غير متصل'}`);
      });
      
      return true;
    } catch (error) {
      console.log('❌ خطأ في فحص المستخدمين:', error.message);
      return false;
    }
  }

  async testCRUD() {
    console.log('\n🧪 اختبار عمليات CRUD...');
    try {
      // إنشاء مستخدم تجريبي
      const insertResult = await this.pool.query(`
        INSERT INTO users (username, password, user_type, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username
      `, ['test_crud_user', 'test123', 'member', 'member']);
      
      const userId = insertResult.rows[0].id;
      console.log(`✅ إنشاء مستخدم: ID ${userId}, اسم: ${insertResult.rows[0].username}`);
      
      // قراءة المستخدم
      const selectResult = await this.pool.query(`
        SELECT username, user_type FROM users WHERE id = $1
      `, [userId]);
      
      if (selectResult.rows.length > 0) {
        console.log('✅ قراءة المستخدم نجحت');
      }
      
      // تحديث المستخدم
      await this.pool.query(`
        UPDATE users SET user_type = $1 WHERE id = $2
      `, ['vip', userId]);
      console.log('✅ تحديث المستخدم نجح');
      
      // حذف المستخدم
      await this.pool.query(`
        DELETE FROM users WHERE id = $1
      `, [userId]);
      console.log('✅ حذف المستخدم نجح');
      
      return true;
    } catch (error) {
      console.log('❌ خطأ في اختبار CRUD:', error.message);
      return false;
    }
  }

  async checkPerformance() {
    console.log('\n⚡ اختبار الأداء...');
    try {
      const startTime = Date.now();
      
      await this.pool.query(`
        SELECT COUNT(*) as total_users FROM users
      `);
      
      const queryTime = Date.now() - startTime;
      console.log(`📊 وقت الاستعلام: ${queryTime} مللي ثانية`);
      
      if (queryTime < 1000) {
        console.log('✅ الأداء جيد');
        return true;
      } else {
        console.log('⚠️ الأداء بطيء');
        return false;
      }
    } catch (error) {
      console.log('❌ خطأ في اختبار الأداء:', error.message);
      return false;
    }
  }

  async runAllTests() {
    const results = [];
    
    // تهيئة
    if (!await this.init()) {
      console.log('\n❌ فشل في تهيئة الاختبار');
      return false;
    }
    
    // اختبار الاتصال
    results.push(await this.testConnection());
    
    // فحص الجداول
    results.push(await this.checkTables());
    
    // فحص المستخدمين
    results.push(await this.checkUsers());
    
    // اختبار CRUD
    results.push(await this.testCRUD());
    
    // اختبار الأداء
    results.push(await this.checkPerformance());
    
    // النتائج النهائية
    const passedTests = results.filter(r => r === true).length;
    const totalTests = results.length;
    
    console.log('\n📊 نتائج الاختبار:');
    console.log(`✅ نجح: ${passedTests}/${totalTests} اختبار`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 جميع الاختبارات نجحت! قاعدة البيانات تعمل بشكل مثالي');
      return true;
    } else {
      console.log('\n⚠️ بعض الاختبارات فشلت. راجع التفاصيل أعلاه');
      return false;
    }
  }

  async cleanup() {
    if (this.pool) {
      await this.pool.end();
      console.log('\n🔒 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

// تشغيل الاختبار
async function main() {
  const tester = new DatabaseTester();
  
  try {
    const success = await tester.runAllTests();
    await tester.cleanup();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.log('\n❌ خطأ غير متوقع:', error.message);
    await tester.cleanup();
    process.exit(1);
  }
}

main();