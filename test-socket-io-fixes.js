#!/usr/bin/env node

/**
 * اختبار مخصص لإصلاحات Socket.IO
 * يناير 2025
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

console.log('🔌 اختبار إصلاحات Socket.IO');
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

// اختبار الاتصال الأساسي
async function testBasicConnection() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة الاتصال'));
    }, 10000);

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`   📊 معرف الاتصال: ${socket.id}`);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`خطأ في الاتصال: ${error.message}`));
    });
  });
}

// اختبار استلام رسالة الترحيب
async function testWelcomeMessage() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('لم يتم استلام رسالة الترحيب'));
    }, 5000);

    const socket = io(SERVER_URL);

    socket.on('socketConnected', (data) => {
      clearTimeout(timeout);
      console.log(`   📊 رسالة الترحيب: ${data.message}`);
      console.log(`   📊 الوقت: ${data.timestamp}`);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// اختبار المصادقة وقائمة المستخدمين
async function testAuthenticationAndUserList() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة المصادقة'));
    }, 10000);

    const socket = io(SERVER_URL);

    socket.on('connect', () => {
      // إرسال رسالة المصادقة
      socket.emit('message', JSON.stringify({
        type: 'auth',
        userId: 1,
        username: 'test_user_socket'
      }));
    });

    socket.on('onlineUsers', (data) => {
      clearTimeout(timeout);
      if (data && data.users && Array.isArray(data.users)) {
        console.log(`   📊 تم استلام قائمة المستخدمين: ${data.users.length} مستخدم`);
        console.log(`   📊 أول مستخدم: ${data.users[0]?.username || 'غير محدد'}`);
        socket.disconnect();
        resolve();
      } else {
        reject(new Error('بيانات المستخدمين غير صحيحة'));
      }
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// اختبار إشعارات انضمام/مغادرة المستخدمين
async function testUserJoinLeaveNotifications() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة اختبار إشعارات المستخدمين'));
    }, 15000);

    let userJoinedReceived = false;
    let userLeftReceived = false;

    const socket1 = io(SERVER_URL);
    let socket2;

    const checkComplete = () => {
      if (userJoinedReceived && userLeftReceived) {
        clearTimeout(timeout);
        socket1.disconnect();
        if (socket2) socket2.disconnect();
        resolve();
      }
    };

    socket1.on('connect', () => {
      // مصادقة المستخدم الأول
      socket1.emit('message', JSON.stringify({
        type: 'auth',
        userId: 1,
        username: 'test_user_1'
      }));

      // إنشاء المستخدم الثاني بعد ثانيتين
      setTimeout(() => {
        socket2 = io(SERVER_URL);
        
        socket2.on('connect', () => {
          socket2.emit('message', JSON.stringify({
            type: 'auth',
            userId: 2,
            username: 'test_user_2'
          }));

          // قطع اتصال المستخدم الثاني بعد ثانيتين
          setTimeout(() => {
            socket2.disconnect();
          }, 2000);
        });
      }, 2000);
    });

    socket1.on('userJoined', (data) => {
      if (data && data.user) {
        console.log(`   📊 إشعار انضمام: ${data.user.username}`);
        userJoinedReceived = true;
        checkComplete();
      }
    });

    socket1.on('userLeft', (data) => {
      if (data && data.user) {
        console.log(`   📊 إشعار مغادرة: ${data.user.username}`);
        userLeftReceived = true;
        checkComplete();
      }
    });

    socket1.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// اختبار إرسال رسالة عامة
async function testPublicMessage() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة اختبار الرسائل العامة'));
    }, 10000);

    const socket = io(SERVER_URL);
    const testMessage = `رسالة اختبار ${Date.now()}`;

    socket.on('connect', () => {
      // مصادقة المستخدم
      socket.emit('message', JSON.stringify({
        type: 'auth',
        userId: 1,
        username: 'test_user_message'
      }));

      // إرسال رسالة عامة بعد ثانية
      setTimeout(() => {
        socket.emit('message', JSON.stringify({
          type: 'publicMessage',
          content: testMessage,
          roomId: 'general'
        }));
      }, 1000);
    });

    socket.on('message', (data) => {
      if (data.type === 'publicMessage' && data.content === testMessage) {
        clearTimeout(timeout);
        console.log(`   📊 تم استلام الرسالة: ${data.content}`);
        console.log(`   📊 من المستخدم: ${data.username}`);
        socket.disconnect();
        resolve();
      }
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// اختبار heartbeat
async function testHeartbeat() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('لم يتم استلام heartbeat'));
    }, 15000);

    const socket = io(SERVER_URL);

    socket.on('connect', () => {
      // مصادقة المستخدم لتفعيل heartbeat
      socket.emit('message', JSON.stringify({
        type: 'auth',
        userId: 1,
        username: 'test_user_heartbeat'
      }));
    });

    socket.on('ping', (data) => {
      clearTimeout(timeout);
      console.log(`   📊 تم استلام ping في: ${new Date(data.timestamp).toLocaleTimeString()}`);
      
      // إرسال pong
      socket.emit('pong', { timestamp: Date.now() });
      
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// اختبار إشعارات الغرف
async function testRoomNotifications() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة اختبار إشعارات الغرف'));
    }, 15000);

    let roomCreatedReceived = false;
    let roomsUpdatedReceived = false;

    const socket = io(SERVER_URL);

    const checkComplete = () => {
      if (roomCreatedReceived && roomsUpdatedReceived) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
      }
    };

    socket.on('connect', () => {
      // مصادقة المستخدم
      socket.emit('message', JSON.stringify({
        type: 'auth',
        userId: 1,
        username: 'test_user_rooms'
      }));
    });

    socket.on('roomCreated', (data) => {
      if (data && data.room) {
        console.log(`   📊 إشعار إنشاء غرفة: ${data.room.name}`);
        roomCreatedReceived = true;
        checkComplete();
      }
    });

    socket.on('roomsUpdated', (data) => {
      if (data && data.rooms && Array.isArray(data.rooms)) {
        console.log(`   📊 قائمة الغرف المحدثة: ${data.rooms.length} غرفة`);
        roomsUpdatedReceived = true;
        checkComplete();
      }
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// تشغيل جميع الاختبارات
async function runAllSocketTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 بدء اختبارات Socket.IO');
  console.log('='.repeat(50));

  await runTest('الاتصال الأساسي', testBasicConnection);
  await runTest('رسالة الترحيب', testWelcomeMessage);
  await runTest('المصادقة وقائمة المستخدمين', testAuthenticationAndUserList);
  await runTest('إشعارات انضمام/مغادرة المستخدمين', testUserJoinLeaveNotifications);
  await runTest('إرسال رسالة عامة', testPublicMessage);
  await runTest('نظام Heartbeat', testHeartbeat);
  await runTest('إشعارات الغرف', testRoomNotifications);

  console.log('\n' + '='.repeat(50));
  console.log('📊 نتائج اختبارات Socket.IO');
  console.log('='.repeat(50));
  console.log(`✅ نجح: ${testResults.passed}`);
  console.log(`❌ فشل: ${testResults.failed}`);
  console.log(`📊 المجموع: ${testResults.total}`);
  console.log(`📈 معدل النجاح: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 جميع اختبارات Socket.IO نجحت!');
  } else {
    console.log('\n⚠️ بعض اختبارات Socket.IO فشلت.');
  }
}

runAllSocketTests().catch((error) => {
  console.error('❌ خطأ في اختبارات Socket.IO:', error);
  process.exit(1);
});