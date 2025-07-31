#!/usr/bin/env node

/**
 * اختبار عمليات قاعدة البيانات
 * يناير 2025
 */

import axios from 'axios';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

console.log('🗄️ اختبار عمليات قاعدة البيانات');
console.log(`📡 عنوان الخادم: ${SERVER_URL}`);

let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

function printResult(testName, success, details = '') {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
}

async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    console.log(`\n🔍 اختبار: ${testName}`);
    await testFunction();
    testResults.passed++;
    printResult(testName, true);
  } catch (error) {
    testResults.failed++;
    printResult(testName, false, error.message);
  }
}

// اختبار جلب جميع المستخدمين من قاعدة البيانات
async function testFetchAllUsers() {
  const response = await axios.get(`${SERVER_URL}/api/users`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { users } = response.data;
  
  if (!Array.isArray(users)) {
    throw new Error('البيانات المُستلمة ليست مصفوفة');
  }
  
  console.log(`   📊 تم جلب ${users.length} مستخدم من قاعدة البيانات`);
  
  // فحص بنية البيانات
  if (users.length > 0) {
    const user = users[0];
    const requiredFields = ['id', 'username', 'userType', 'createdAt'];
    
    for (const field of requiredFields) {
      if (!(field in user)) {
        throw new Error(`الحقل المطلوب '${field}' غير موجود`);
      }
    }
    
    console.log(`   📊 مثال على المستخدم: ${user.username} (${user.userType})`);
  }
}

// اختبار جلب المستخدمين المتصلين فقط
async function testFetchOnlineUsers() {
  const response = await axios.get(`${SERVER_URL}/api/users/online`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { users } = response.data;
  
  console.log(`   📊 المستخدمون المتصلون: ${users.length}`);
  
  // التحقق من أن جميع المستخدمين متصلين فعلاً
  for (const user of users) {
    if (!user.isOnline) {
      throw new Error(`المستخدم ${user.username} يظهر في قائمة المتصلين لكنه غير متصل`);
    }
  }
}

// اختبار جلب مستخدم محدد
async function testFetchSpecificUser() {
  const userId = 1;
  const response = await axios.get(`${SERVER_URL}/api/users/${userId}`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { user } = response.data;
  
  if (!user) {
    throw new Error('لم يتم العثور على المستخدم');
  }
  
  if (user.id !== userId) {
    throw new Error(`معرف المستخدم غير مطابق: متوقع ${userId}، تم الحصول على ${user.id}`);
  }
  
  console.log(`   📊 تم جلب المستخدم: ${user.username} (ID: ${user.id})`);
}

// اختبار تحديث بيانات المستخدم
async function testUpdateUser() {
  const testData = {
    userId: 1,
    status: `حالة اختبار ${Date.now()}`,
    bio: 'سيرة ذاتية للاختبار',
    country: 'السعودية'
  };
  
  const response = await axios.post(`${SERVER_URL}/api/users/update-profile`, testData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { success, user } = response.data;
  
  if (!success) {
    throw new Error('فشل في تحديث بيانات المستخدم');
  }
  
  if (!user) {
    throw new Error('لم يتم إرجاع بيانات المستخدم المحدثة');
  }
  
  console.log(`   📊 تم تحديث المستخدم: ${user.username}`);
  console.log(`   📊 الحالة الجديدة: ${user.status}`);
}

// اختبار جلب جميع الغرف
async function testFetchAllRooms() {
  const response = await axios.get(`${SERVER_URL}/api/rooms`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { rooms } = response.data;
  
  if (!Array.isArray(rooms)) {
    throw new Error('البيانات المُستلمة ليست مصفوفة');
  }
  
  console.log(`   📊 تم جلب ${rooms.length} غرفة من قاعدة البيانات`);
  
  // فحص بنية البيانات
  if (rooms.length > 0) {
    const room = rooms[0];
    const requiredFields = ['id', 'name', 'isActive'];
    
    for (const field of requiredFields) {
      if (!(field in room)) {
        throw new Error(`الحقل المطلوب '${field}' غير موجود في بيانات الغرفة`);
      }
    }
    
    console.log(`   📊 مثال على الغرفة: ${room.name} (نشطة: ${room.isActive})`);
  }
}

// اختبار إنشاء غرفة جديدة
async function testCreateRoom() {
  const roomData = {
    name: `غرفة اختبار قاعدة البيانات ${Date.now()}`,
    description: 'غرفة للاختبار التلقائي لقاعدة البيانات',
    userId: 1
  };
  
  const response = await axios.post(`${SERVER_URL}/api/rooms`, roomData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { room } = response.data;
  
  if (!room || !room.id) {
    throw new Error('لم يتم إنشاء الغرفة بشكل صحيح');
  }
  
  console.log(`   📊 تم إنشاء الغرفة: ${room.name} (ID: ${room.id})`);
  
  // حفظ معرف الغرفة للاختبارات اللاحقة
  global.testRoomId = room.id;
  
  return room;
}

// اختبار الانضمام للغرفة
async function testJoinRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const joinData = {
    userId: 1
  };
  
  const response = await axios.post(`${SERVER_URL}/api/rooms/${global.testRoomId}/join`, joinData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم الانضمام للغرفة ${global.testRoomId} في قاعدة البيانات`);
}

// اختبار مغادرة الغرفة
async function testLeaveRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const leaveData = {
    userId: 1
  };
  
  const response = await axios.post(`${SERVER_URL}/api/rooms/${global.testRoomId}/leave`, leaveData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم مغادرة الغرفة ${global.testRoomId} في قاعدة البيانات`);
}

// اختبار حذف الغرفة
async function testDeleteRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const deleteData = {
    userId: 1
  };
  
  const response = await axios.delete(`${SERVER_URL}/api/rooms/${global.testRoomId}`, {
    data: deleteData
  });
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم حذف الغرفة ${global.testRoomId} من قاعدة البيانات`);
  
  // التحقق من أن الغرفة تم حذفها فعلاً
  try {
    await axios.get(`${SERVER_URL}/api/rooms/${global.testRoomId}`);
    throw new Error('الغرفة ما زالت موجودة بعد الحذف');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`   📊 تأكيد: الغرفة غير موجودة بعد الحذف`);
    } else {
      throw error;
    }
  }
}

// اختبار سلامة البيانات
async function testDataIntegrity() {
  // جلب عدد المستخدمين
  const usersResponse = await axios.get(`${SERVER_URL}/api/users`);
  const usersCount = usersResponse.data.users.length;
  
  // جلب عدد الغرف
  const roomsResponse = await axios.get(`${SERVER_URL}/api/rooms`);
  const roomsCount = roomsResponse.data.rooms.length;
  
  console.log(`   📊 إجمالي المستخدمين: ${usersCount}`);
  console.log(`   📊 إجمالي الغرف: ${roomsCount}`);
  
  if (usersCount === 0) {
    throw new Error('لا توجد مستخدمين في قاعدة البيانات');
  }
  
  // التحقق من وجود غرفة افتراضية على الأقل
  const defaultRooms = roomsResponse.data.rooms.filter(room => room.isDefault);
  if (defaultRooms.length === 0) {
    console.log('   ⚠️ تحذير: لا توجد غرف افتراضية');
  } else {
    console.log(`   📊 الغرف الافتراضية: ${defaultRooms.length}`);
  }
}

// اختبار الاتصال بقاعدة البيانات
async function testDatabaseConnection() {
  try {
    // محاولة جلب بيانات بسيطة للتحقق من الاتصال
    const response = await axios.get(`${SERVER_URL}/api/health`);
    
    if (response.status !== 200) {
      throw new Error(`خادم غير متاح: HTTP ${response.status}`);
    }
    
    console.log(`   📊 حالة الخادم: متصل`);
    console.log(`   📊 بيانات الصحة: ${JSON.stringify(response.data)}`);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('فشل في الاتصال بقاعدة البيانات - الخادم غير متاح');
    }
    throw error;
  }
}

// تشغيل جميع اختبارات قاعدة البيانات
async function runAllDatabaseTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 بدء اختبارات قاعدة البيانات');
  console.log('='.repeat(50));

  // اختبارات الاتصال
  console.log('\n🔗 اختبارات الاتصال:');
  await runTest('الاتصال بقاعدة البيانات', testDatabaseConnection);
  await runTest('سلامة البيانات', testDataIntegrity);

  // اختبارات المستخدمين
  console.log('\n👥 اختبارات المستخدمين:');
  await runTest('جلب جميع المستخدمين', testFetchAllUsers);
  await runTest('جلب المستخدمين المتصلين', testFetchOnlineUsers);
  await runTest('جلب مستخدم محدد', testFetchSpecificUser);
  await runTest('تحديث بيانات المستخدم', testUpdateUser);

  // اختبارات الغرف
  console.log('\n🏠 اختبارات الغرف:');
  await runTest('جلب جميع الغرف', testFetchAllRooms);
  await runTest('إنشاء غرفة جديدة', testCreateRoom);
  await runTest('الانضمام للغرفة', testJoinRoom);
  await runTest('مغادرة الغرفة', testLeaveRoom);
  await runTest('حذف الغرفة', testDeleteRoom);

  console.log('\n' + '='.repeat(50));
  console.log('📊 نتائج اختبارات قاعدة البيانات');
  console.log('='.repeat(50));
  console.log(`✅ نجح: ${testResults.passed}`);
  console.log(`❌ فشل: ${testResults.failed}`);
  console.log(`📊 المجموع: ${testResults.total}`);
  console.log(`📈 معدل النجاح: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 جميع اختبارات قاعدة البيانات نجحت!');
    console.log('✅ قاعدة البيانات تعمل بشكل مثالي');
  } else {
    console.log('\n⚠️ بعض اختبارات قاعدة البيانات فشلت.');
    console.log('🔧 يرجى مراجعة إعدادات قاعدة البيانات');
  }
}

runAllDatabaseTests().catch((error) => {
  console.error('❌ خطأ في اختبارات قاعدة البيانات:', error);
  process.exit(1);
});