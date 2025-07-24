#!/usr/bin/env node

/**
 * 🔍 تشخيص سريع لمشكلة النقاط
 * يتحقق من سبب خطأ "المستخدم غير موجود"
 */

require('dotenv').config();

async function debugPointsIssue() {
  console.log('🔍 بدء تشخيص مشكلة النقاط...\n');

  try {
    // 1. اختبار اتصال قاعدة البيانات
    console.log('📡 1. اختبار اتصال قاعدة البيانات...');
    const { storage } = require('./server/storage');
    
    // 2. فحص المستخدمين الموجودين
    console.log('\n👥 2. فحص المستخدمين الموجودين...');
    
    try {
      const users = await storage.getAllUsers();
      console.log(`✅ عدد المستخدمين في قاعدة البيانات: ${users.length}`);
      
      if (users.length > 0) {
        console.log('📋 أول 5 مستخدمين:');
        users.slice(0, 5).forEach((user, index) => {
          console.log(`   ${index + 1}. ID: ${user.id}, Username: ${user.username}, Type: ${user.userType}`);
        });
      }
    } catch (error) {
      console.error('❌ خطأ في الحصول على المستخدمين:', error.message);
      return;
    }

    // 3. اختبار getUser لمستخدمين معينين
    console.log('\n🔍 3. اختبار getUser للمستخدمين...');
    
    const testUserIds = [1, 2, 3]; // معرفات شائعة
    
    for (const userId of testUserIds) {
      try {
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`✅ المستخدم ${userId}: ${user.username} (${user.userType})`);
        } else {
          console.log(`❌ المستخدم ${userId}: غير موجود`);
        }
      } catch (error) {
        console.error(`❌ خطأ في getUser(${userId}):`, error.message);
      }
    }

    // 4. اختبار getUser بالاسم
    console.log('\n🔍 4. اختبار getUserByUsername...');
    
    const testUsernames = ['admin', 'testuser'];
    
    for (const username of testUsernames) {
      try {
        const user = await storage.getUserByUsername(username);
        if (user) {
          console.log(`✅ ${username}: ID=${user.id}, Type=${user.userType}`);
        } else {
          console.log(`❌ ${username}: غير موجود`);
        }
      } catch (error) {
        console.error(`❌ خطأ في getUserByUsername(${username}):`, error.message);
      }
    }

    // 5. اختبار النقاط للمستخدم الموجود
    console.log('\n🎯 5. اختبار إضافة النقاط...');
    
    const admin = await storage.getUserByUsername('admin');
    if (admin) {
      try {
        const { pointsService } = require('./server/services/pointsService');
        
        console.log(`🎯 اختبار إضافة نقاط للمدير (ID: ${admin.id})...`);
        const result = await pointsService.addDailyLoginPoints(admin.id);
        
        if (result) {
          console.log('✅ نجح إضافة النقاط:', result);
        } else {
          console.log('ℹ️ لم يتم إضافة نقاط (ربما حصل عليها اليوم)');
        }
      } catch (error) {
        console.error('❌ خطأ في إضافة النقاط:', error.message);
        console.error('📝 تفاصيل الخطأ:', error.stack);
      }
    } else {
      console.log('❌ لا يمكن اختبار النقاط - المدير غير موجود');
    }

    // 6. فحص نوع قاعدة البيانات
    console.log('\n🗄️ 6. فحص نوع قاعدة البيانات...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        console.log('✅ نوع قاعدة البيانات: PostgreSQL (Supabase)');
      } else if (databaseUrl.startsWith('sqlite:')) {
        console.log('✅ نوع قاعدة البيانات: SQLite');
      } else {
        console.log('⚠️ نوع قاعدة البيانات: غير معروف');
      }
      console.log(`📍 رابط قاعدة البيانات: ${databaseUrl.replace(/:[^:]*@/, ':***@')}`);
    } else {
      console.log('❌ DATABASE_URL غير محدد');
    }

    console.log('\n🎉 انتهى التشخيص!');
    console.log('\n📊 ملخص النتائج:');
    console.log('   - إذا كانت جميع النتائج ✅، فالمشكلة قد تكون في Socket.IO');
    console.log('   - إذا كان هناك ❌، فالمشكلة في قاعدة البيانات أو Storage');
    console.log('   - راجع السجلات أعلاه لتحديد المشكلة الدقيقة');

  } catch (error) {
    console.error('💥 خطأ عام في التشخيص:', error);
    process.exit(1);
  }
}

// تشغيل التشخيص
if (require.main === module) {
  debugPointsIssue()
    .then(() => {
      console.log('\n✅ تم الانتهاء من التشخيص');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 فشل في التشخيص:', error);
      process.exit(1);
    });
}

module.exports = { debugPointsIssue };