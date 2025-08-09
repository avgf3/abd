#!/usr/bin/env node

/**
 * اختبار شامل لوظائف غرفة البث المباشر
 * يختبر جميع وظائف المايك والصلاحيات والأخطاء
 */

const { apiRequest } = require('./quick-test-fixes.js');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// بيانات المستخدمين للاختبار
const testUsers = {
  owner: { username: 'Owner', password: 'admin123', userType: 'owner' },
  admin: { username: 'TestAdmin', password: 'admin123', userType: 'admin' },
  moderator: { username: 'TestModerator', password: 'mod123', userType: 'moderator' },
  user1: { username: 'TestUser1', password: 'user123', userType: 'member' },
  user2: { username: 'TestUser2', password: 'user123', userType: 'member' }
};

let authTokens = {};

async function loginUser(userData) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userData.username,
        password: userData.password
      })
    });

    const data = await response.json();
    if (data.user) {
      log(`✅ تم تسجيل دخول ${userData.username} بنجاح`, 'green');
      return {
        user: data.user,
        token: data.token || 'mock-token'
      };
    } else {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }
  } catch (error) {
    log(`❌ خطأ في تسجيل دخول ${userData.username}: ${error.message}`, 'red');
    return null;
  }
}

async function testAPICall(endpoint, method = 'GET', body = null, token = null, expectedToFail = false) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:5000${endpoint}`, options);
    const data = await response.json();

    if (expectedToFail) {
      if (!response.ok) {
        log(`✅ توقع الفشل وحدث: ${data.error || 'خطأ غير محدد'}`, 'yellow');
        return { success: true, expected: true, error: data.error };
      } else {
        log(`❌ توقع الفشل لكن نجح: ${endpoint}`, 'red');
        return { success: false, unexpected: true };
      }
    } else {
      if (response.ok) {
        log(`✅ نجح: ${method} ${endpoint}`, 'green');
        return { success: true, data };
      } else {
        log(`❌ فشل: ${method} ${endpoint} - ${data.error || 'خطأ غير محدد'}`, 'red');
        return { success: false, error: data.error };
      }
    }
  } catch (error) {
    if (expectedToFail) {
      log(`✅ توقع الفشل وحدث خطأ في الشبكة: ${error.message}`, 'yellow');
      return { success: true, expected: true, error: error.message };
    } else {
      log(`❌ خطأ في الشبكة: ${method} ${endpoint} - ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

async function testBroadcastRoomPermissions() {
  log('\n🎯 === اختبار صلاحيات غرفة البث ===', 'cyan');

  const roomId = 'broadcast';

  // 1. اختبار طلب المايك من مستخدم عادي
  log('\n📋 اختبار طلب المايك من مستخدم عادي...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user1.user.id },
    authTokens.user1.token
  );

  // 2. اختبار موافقة المضيف
  log('\n📋 اختبار موافقة المضيف على طلب المايك...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/approve-mic/${authTokens.user1.user.id}`,
    'POST',
    { approvedBy: authTokens.owner.user.id },
    authTokens.owner.token
  );

  // 3. اختبار موافقة الإدمن
  log('\n📋 اختبار موافقة الإدمن على طلب المايك...', 'blue');
  // طلب مايك من مستخدم آخر
  await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user2.user.id },
    authTokens.user2.token
  );
  
  await testAPICall(
    `/api/rooms/${roomId}/approve-mic/${authTokens.user2.user.id}`,
    'POST',
    { approvedBy: authTokens.admin.user.id },
    authTokens.admin.token
  );

  // 4. اختبار موافقة المشرف
  log('\n📋 اختبار موافقة المشرف على طلب المايك...', 'blue');
  // طلب مايك من المستخدم الأول مرة أخرى (بعد إزالته)
  await testAPICall(
    `/api/rooms/${roomId}/remove-speaker/${authTokens.user1.user.id}`,
    'POST',
    { removedBy: authTokens.owner.user.id },
    authTokens.owner.token
  );
  
  await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user1.user.id },
    authTokens.user1.token
  );
  
  await testAPICall(
    `/api/rooms/${roomId}/approve-mic/${authTokens.user1.user.id}`,
    'POST',
    { approvedBy: authTokens.moderator.user.id },
    authTokens.moderator.token
  );

  // 5. اختبار رفض من مستخدم عادي (يجب أن يفشل)
  log('\n📋 اختبار رفض من مستخدم عادي (يجب أن يفشل)...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/reject-mic/${authTokens.user2.user.id}`,
    'POST',
    { rejectedBy: authTokens.user1.user.id },
    authTokens.user1.token,
    true // متوقع أن يفشل
  );

  // 6. اختبار إزالة متحدث من قبل مشرف
  log('\n📋 اختبار إزالة متحدث من قبل مشرف...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/remove-speaker/${authTokens.user2.user.id}`,
    'POST',
    { removedBy: authTokens.moderator.user.id },
    authTokens.moderator.token
  );
}

async function testBroadcastRoomEdgeCases() {
  log('\n🔍 === اختبار الحالات الاستثنائية ===', 'cyan');

  const roomId = 'broadcast';

  // 1. اختبار طلب المايك مرتين من نفس المستخدم
  log('\n📋 اختبار طلب المايك مرتين من نفس المستخدم...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user1.user.id },
    authTokens.user1.token
  );
  
  await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user1.user.id },
    authTokens.user1.token,
    true // متوقع أن يفشل
  );

  // 2. اختبار الموافقة على مستخدم غير موجود في قائمة الانتظار
  log('\n📋 اختبار الموافقة على مستخدم غير موجود في قائمة الانتظار...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/approve-mic/9999`,
    'POST',
    { approvedBy: authTokens.owner.user.id },
    authTokens.owner.token,
    true // متوقع أن يفشل
  );

  // 3. اختبار إزالة المضيف من المتحدثين (يجب أن يفشل)
  log('\n📋 اختبار إزالة المضيف من المتحدثين (يجب أن يفشل)...', 'blue');
  await testAPICall(
    `/api/rooms/${roomId}/remove-speaker/${authTokens.owner.user.id}`,
    'POST',
    { removedBy: authTokens.admin.user.id },
    authTokens.admin.token,
    true // متوقع أن يفشل
  );

  // 4. اختبار استعلام معلومات الغرفة
  log('\n📋 اختبار جلب معلومات غرفة البث...', 'blue');
  await testAPICall(`/api/rooms/${roomId}/broadcast-info`);

  // 5. اختبار استعلام غرفة غير موجودة
  log('\n📋 اختبار استعلام غرفة غير موجودة...', 'blue');
  await testAPICall('/api/rooms/nonexistent/broadcast-info', 'GET', null, null, true);
}

async function testBroadcastRoomWorkflow() {
  log('\n🔄 === اختبار سير العمل الكامل ===', 'cyan');

  const roomId = 'broadcast';

  // سيناريو كامل: طلب -> موافقة -> تحدث -> إزالة
  log('\n📋 سيناريو كامل للمايك...', 'blue');

  // 1. طلب المايك
  const requestResult = await testAPICall(
    `/api/rooms/${roomId}/request-mic`,
    'POST',
    { userId: authTokens.user2.user.id },
    authTokens.user2.token
  );

  if (requestResult.success) {
    // 2. الموافقة على الطلب
    const approveResult = await testAPICall(
      `/api/rooms/${roomId}/approve-mic/${authTokens.user2.user.id}`,
      'POST',
      { approvedBy: authTokens.admin.user.id },
      authTokens.admin.token
    );

    if (approveResult.success) {
      // 3. فحص حالة المتحدثين
      const infoResult = await testAPICall(`/api/rooms/${roomId}/broadcast-info`);
      
      if (infoResult.success && infoResult.data.info) {
        const speakers = infoResult.data.info.speakers || [];
        const micQueue = infoResult.data.info.micQueue || [];
        
        log(`📊 المتحدثون الحاليون: ${speakers.length}`, 'cyan');
        log(`📊 قائمة انتظار المايك: ${micQueue.length}`, 'cyan');
        
        if (speakers.includes(authTokens.user2.user.id)) {
          log('✅ المستخدم أصبح متحدثاً بنجاح', 'green');
        } else {
          log('❌ المستخدم لم يصبح متحدثاً', 'red');
        }
      }

      // 4. إزالة المتحدث
      await testAPICall(
        `/api/rooms/${roomId}/remove-speaker/${authTokens.user2.user.id}`,
        'POST',
        { removedBy: authTokens.owner.user.id },
        authTokens.owner.token
      );
    }
  }
}

async function runBroadcastRoomTests() {
  log('🚀 بدء اختبار شامل لغرفة البث المباشر...', 'cyan');
  log('=' .repeat(60), 'cyan');

  try {
    // تسجيل دخول جميع المستخدمين
    log('\n🔐 تسجيل دخول المستخدمين...', 'yellow');
    
    for (const [key, userData] of Object.entries(testUsers)) {
      const result = await loginUser(userData);
      if (result) {
        authTokens[key] = result;
      } else {
        log(`❌ فشل تسجيل دخول ${key}`, 'red');
        return;
      }
    }

    log(`✅ تم تسجيل دخول ${Object.keys(authTokens).length} مستخدمين`, 'green');

    // تشغيل الاختبارات
    await testBroadcastRoomPermissions();
    await testBroadcastRoomEdgeCases();
    await testBroadcastRoomWorkflow();

    log('\n🎉 انتهت جميع اختبارات غرفة البث!', 'green');
    log('=' .repeat(60), 'cyan');

  } catch (error) {
    log(`❌ خطأ عام في الاختبار: ${error.message}`, 'red');
    console.error(error);
  }
}

// تشغيل الاختبارات إذا تم تشغيل الملف مباشرة
if (require.main === module) {
  runBroadcastRoomTests().catch(console.error);
}

module.exports = {
  runBroadcastRoomTests,
  testBroadcastRoomPermissions,
  testBroadcastRoomEdgeCases,
  testBroadcastRoomWorkflow
};