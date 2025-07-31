#!/usr/bin/env node

/**
 * اختبار شامل لجميع الإصلاحات المنجزة
 * يناير 2025
 */

import axios from 'axios';
import { io } from 'socket.io-client';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// إعدادات الاختبار
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const TEST_USER_ID = 1;
const TEST_USER_2_ID = 2;
const TEST_ROOM_ID = 'test-room-' + Date.now();

console.log('🧪 بدء الاختبارات الشاملة للإصلاحات...');
console.log(`📡 عنوان الخادم: ${SERVER_URL}`);

// دالة مساعدة للانتظار
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// دالة مساعدة لطباعة النتائج
const printResult = (testName, success, details = '') => {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${testName}`);
  if (details) console.log(`   ${details}`);
};

// متغيرات للاختبار
let socket1, socket2;
let testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

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

// ==========================================
// اختبارات قائمة المستخدمين المتصلين
// ==========================================

async function testGetAllUsers() {
  const response = await axios.get(`${SERVER_URL}/api/users`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { users } = response.data;
  
  if (!Array.isArray(users)) {
    throw new Error('البيانات المُستلمة ليست مصفوفة');
  }
  
  if (users.length === 0) {
    throw new Error('لا توجد مستخدمين في القائمة');
  }
  
  console.log(`   📊 تم جلب ${users.length} مستخدم`);
  
  // التحقق من وجود الحقول المطلوبة
  const firstUser = users[0];
  const requiredFields = ['id', 'username', 'userType', 'isOnline'];
  
  for (const field of requiredFields) {
    if (!(field in firstUser)) {
      throw new Error(`الحقل المطلوب '${field}' غير موجود`);
    }
  }
}

async function testGetOnlineUsers() {
  const response = await axios.get(`${SERVER_URL}/api/users/online`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { users } = response.data;
  
  if (!Array.isArray(users)) {
    throw new Error('البيانات المُستلمة ليست مصفوفة');
  }
  
  console.log(`   📊 المستخدمون المتصلون: ${users.length}`);
  
  // التحقق من أن جميع المستخدمين متصلين
  for (const user of users) {
    if (!user.isOnline) {
      throw new Error(`المستخدم ${user.username} يظهر في قائمة المتصلين لكنه غير متصل`);
    }
  }
}

// ==========================================
// اختبارات عمليات الغرف
// ==========================================

async function testGetAllRooms() {
  const response = await axios.get(`${SERVER_URL}/api/rooms`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { rooms } = response.data;
  
  if (!Array.isArray(rooms)) {
    throw new Error('البيانات المُستلمة ليست مصفوفة');
  }
  
  console.log(`   📊 تم جلب ${rooms.length} غرفة`);
  
  // التحقق من وجود الحقول المطلوبة
  if (rooms.length > 0) {
    const firstRoom = rooms[0];
    const requiredFields = ['id', 'name', 'isActive'];
    
    for (const field of requiredFields) {
      if (!(field in firstRoom)) {
        throw new Error(`الحقل المطلوب '${field}' غير موجود في بيانات الغرفة`);
      }
    }
  }
}

async function testCreateRoom() {
  const roomData = {
    name: `غرفة اختبار ${Date.now()}`,
    description: 'غرفة للاختبار الآلي',
    userId: TEST_USER_ID
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

async function testJoinRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const joinData = {
    userId: TEST_USER_ID
  };
  
  const response = await axios.post(`${SERVER_URL}/api/rooms/${global.testRoomId}/join`, joinData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم الانضمام للغرفة ${global.testRoomId}`);
}

async function testLeaveRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const leaveData = {
    userId: TEST_USER_ID
  };
  
  const response = await axios.post(`${SERVER_URL}/api/rooms/${global.testRoomId}/leave`, leaveData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم مغادرة الغرفة ${global.testRoomId}`);
}

async function testDeleteRoom() {
  if (!global.testRoomId) {
    throw new Error('لا يوجد معرف غرفة للاختبار');
  }
  
  const deleteData = {
    userId: TEST_USER_ID
  };
  
  const response = await axios.delete(`${SERVER_URL}/api/rooms/${global.testRoomId}`, {
    data: deleteData
  });
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  console.log(`   📊 تم حذف الغرفة ${global.testRoomId}`);
}

// ==========================================
// اختبارات تحديث الملف الشخصي
// ==========================================

async function testUpdateProfile() {
  const profileData = {
    userId: TEST_USER_ID,
    username: `مستخدم_اختبار_${Date.now()}`,
    status: 'اختبار تحديث الملف الشخصي',
    bio: 'هذا اختبار آلي لتحديث الملف الشخصي',
    age: 25,
    country: 'السعودية',
    gender: 'ذكر'
  };
  
  const response = await axios.post(`${SERVER_URL}/api/users/update-profile`, profileData);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { success, user } = response.data;
  
  if (!success) {
    throw new Error('فشل في تحديث الملف الشخصي');
  }
  
  if (!user) {
    throw new Error('لم يتم إرجاع بيانات المستخدم المحدثة');
  }
  
  console.log(`   📊 تم تحديث ملف ${user.username} بنجاح`);
}

async function testGetUserProfile() {
  const response = await axios.get(`${SERVER_URL}/api/users/${TEST_USER_ID}`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const { user } = response.data;
  
  if (!user) {
    throw new Error('لم يتم العثور على بيانات المستخدم');
  }
  
  console.log(`   📊 تم جلب ملف ${user.username} بنجاح`);
}

// ==========================================
// اختبارات Socket.IO
// ==========================================

async function testSocketConnection() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة الاتصال بـ Socket.IO'));
    }, 10000);
    
    socket1 = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });
    
    socket1.on('connect', () => {
      clearTimeout(timeout);
      console.log(`   📊 تم الاتصال بـ Socket.IO: ${socket1.id}`);
      resolve();
    });
    
    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`خطأ في الاتصال: ${error.message}`));
    });
  });
}

async function testSocketAuthentication() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة المصادقة'));
    }, 5000);
    
    socket1.on('onlineUsers', (data) => {
      clearTimeout(timeout);
      if (data && data.users && Array.isArray(data.users)) {
        console.log(`   📊 تم استلام قائمة المستخدمين: ${data.users.length} مستخدم`);
        resolve();
      } else {
        reject(new Error('بيانات المستخدمين غير صحيحة'));
      }
    });
    
    // إرسال رسالة المصادقة
    socket1.emit('message', JSON.stringify({
      type: 'auth',
      userId: TEST_USER_ID,
      username: 'test_user'
    }));
  });
}

async function testSocketRoomOperations() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة اختبار عمليات الغرف'));
    }, 10000);
    
    let roomCreatedReceived = false;
    let roomsUpdatedReceived = false;
    
    const checkComplete = () => {
      if (roomCreatedReceived && roomsUpdatedReceived) {
        clearTimeout(timeout);
        resolve();
      }
    };
    
    socket1.on('roomCreated', (data) => {
      if (data && data.room) {
        console.log(`   📊 تم استلام إشعار إنشاء الغرفة: ${data.room.name}`);
        roomCreatedReceived = true;
        checkComplete();
      }
    });
    
    socket1.on('roomsUpdated', (data) => {
      if (data && data.rooms && Array.isArray(data.rooms)) {
        console.log(`   📊 تم استلام قائمة الغرف المحدثة: ${data.rooms.length} غرفة`);
        roomsUpdatedReceived = true;
        checkComplete();
      }
    });
    
    // إنشاء غرفة لاختبار الإشعارات
    setTimeout(async () => {
      try {
        await testCreateRoom();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    }, 1000);
  });
}

async function testSocketProfileUpdate() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة اختبار تحديث الملف الشخصي'));
    }, 5000);
    
    socket1.on('userProfileUpdated', (data) => {
      if (data && data.userId && data.user) {
        console.log(`   📊 تم استلام إشعار تحديث الملف الشخصي للمستخدم: ${data.user.username}`);
        clearTimeout(timeout);
        resolve();
      }
    });
    
    // تحديث الملف الشخصي لاختبار الإشعارات
    setTimeout(async () => {
      try {
        await testUpdateProfile();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    }, 1000);
  });
}

// ==========================================
// اختبارات الصحة العامة
// ==========================================

async function testServerHealth() {
  const response = await axios.get(`${SERVER_URL}/api/health`);
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const healthData = response.data;
  
  console.log(`   📊 حالة الخادم: ${JSON.stringify(healthData)}`);
}

// ==========================================
// تشغيل جميع الاختبارات
// ==========================================

async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 بدء الاختبارات الشاملة');
  console.log('='.repeat(50));
  
  // اختبارات الصحة العامة
  console.log('\n📋 اختبارات الصحة العامة:');
  await runTest('صحة الخادم', testServerHealth);
  
  // اختبارات المستخدمين
  console.log('\n👥 اختبارات المستخدمين:');
  await runTest('جلب جميع المستخدمين', testGetAllUsers);
  await runTest('جلب المستخدمين المتصلين', testGetOnlineUsers);
  await runTest('جلب ملف شخصي محدد', testGetUserProfile);
  
  // اختبارات الغرف
  console.log('\n🏠 اختبارات الغرف:');
  await runTest('جلب جميع الغرف', testGetAllRooms);
  await runTest('إنشاء غرفة جديدة', testCreateRoom);
  await runTest('الانضمام للغرفة', testJoinRoom);
  await runTest('مغادرة الغرفة', testLeaveRoom);
  
  // اختبارات الملف الشخصي
  console.log('\n📝 اختبارات الملف الشخصي:');
  await runTest('تحديث الملف الشخصي', testUpdateProfile);
  
  // اختبارات Socket.IO
  console.log('\n🔌 اختبارات Socket.IO:');
  await runTest('الاتصال بـ Socket.IO', testSocketConnection);
  await runTest('مصادقة Socket.IO', testSocketAuthentication);
  await runTest('إشعارات عمليات الغرف', testSocketRoomOperations);
  await runTest('إشعارات تحديث الملف الشخصي', testSocketProfileUpdate);
  
  // حذف الغرفة التجريبية
  console.log('\n🧹 تنظيف البيانات التجريبية:');
  await runTest('حذف الغرفة التجريبية', testDeleteRoom);
  
  // النتائج النهائية
  console.log('\n' + '='.repeat(50));
  console.log('📊 نتائج الاختبارات النهائية');
  console.log('='.repeat(50));
  console.log(`✅ نجح: ${testResults.passed}`);
  console.log(`❌ فشل: ${testResults.failed}`);
  console.log(`📊 المجموع: ${testResults.total}`);
  console.log(`📈 معدل النجاح: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.');
  } else {
    console.log('\n⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.');
  }
  
  // إغلاق الاتصالات
  if (socket1) {
    socket1.disconnect();
  }
  if (socket2) {
    socket2.disconnect();
  }
}

// تشغيل الاختبارات
runAllTests().catch((error) => {
  console.error('❌ خطأ في تشغيل الاختبارات:', error);
  process.exit(1);
});