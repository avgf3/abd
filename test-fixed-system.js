#!/usr/bin/env node

const io = require('socket.io-client');

// إعدادات الاختبار
const SERVER_URL = 'http://localhost:3000';
const TEST_USERS = [
  { username: 'ئءؤر', userType: 'guest' },
  { username: 'عبود', userType: 'owner' },
  { username: 'ربيس', userType: 'guest' }
];

let connectedSockets = [];
let testResults = {
  authentication: [],
  roomJoining: [],
  messageHandling: [],
  userListUpdates: []
};

console.log('🧪 بدء اختبار النظام المحسن...\n');

// دالة مساعدة لانتظار وقت معين
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// دالة لتسجيل النتائج
function logResult(category, test, success, details = '') {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${test}: ${details}`);
  testResults[category].push({ test, success, details });
}

// اختبار المصادقة
async function testAuthentication() {
  console.log('📝 اختبار 1: المصادقة الموحدة');
  
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    const socket = io(SERVER_URL, { 
      transports: ['websocket'],
      timeout: 5000
    });
    
    connectedSockets.push({ socket, user });
    
    let authReceived = false;
    let duplicateAuth = false;
    let authCount = 0;
    
    socket.on('authenticated', (data) => {
      authCount++;
      if (authCount === 1) {
        authReceived = true;
        logResult('authentication', `مصادقة ${user.username}`, true, 
          `تمت المصادقة بنجاح للمستخدم ${user.username}`);
      } else {
        duplicateAuth = true;
        logResult('authentication', `تكرار مصادقة ${user.username}`, false, 
          `تم تلقي ${authCount} مصادقة للمستخدم نفسه`);
      }
    });
    
    socket.on('error', (error) => {
      logResult('authentication', `خطأ مصادقة ${user.username}`, false, error.message);
    });
    
    socket.on('socketConnected', () => {
      console.log(`🔌 ${user.username} متصل بـ Socket.IO`);
      
      // إرسال طلب المصادقة
      socket.emit('authenticate', {
        username: user.username,
        userType: user.userType,
        authType: 'guest'
      });
    });
    
    // انتظار 2 ثانية بين كل اتصال
    await sleep(2000);
    
    // التحقق من عدم وجود تكرار
    setTimeout(() => {
      if (!duplicateAuth && authReceived) {
        logResult('authentication', `لا تكرار ${user.username}`, true, 
          'لم يحدث تكرار في المصادقة');
      }
    }, 1000);
  }
  
  console.log('\n');
}

// اختبار الانضمام للغرف
async function testRoomJoining() {
  console.log('📝 اختبار 2: الانضمام للغرف بدون تكرار');
  
  await sleep(3000); // انتظار لضمان اكتمال المصادقة
  
  for (let i = 0; i < connectedSockets.length; i++) {
    const { socket, user } = connectedSockets[i];
    
    let roomJoinCount = 0;
    let userJoinedCount = 0;
    let onlineUsersCount = 0;
    
    socket.on('message', (data) => {
      if (data.type === 'roomJoined') {
        roomJoinCount++;
        logResult('roomJoining', `انضمام ${user.username} للغرفة`, 
          roomJoinCount === 1, `عدد رسائل roomJoined: ${roomJoinCount}`);
      }
      
      if (data.type === 'userJoinedRoom') {
        userJoinedCount++;
      }
      
      if (data.type === 'onlineUsers') {
        onlineUsersCount++;
        if (onlineUsersCount <= 2) { // نتوقع تحديث أو اثنين كحد أقصى
          logResult('roomJoining', `تحديث قائمة المستخدمين`, true, 
            `عدد تحديثات قائمة المستخدمين: ${onlineUsersCount}`);
        } else {
          logResult('roomJoining', `تكرار تحديث قائمة المستخدمين`, false, 
            `عدد تحديثات مفرط: ${onlineUsersCount}`);
        }
      }
    });
    
    // محاولة الانضمام للغرفة العامة
    socket.emit('joinRoom', { roomId: 'general' });
    await sleep(1000);
    
    // محاولة الانضمام للغرفة نفسها مرة أخرى (يجب أن لا يحدث تكرار)
    socket.emit('joinRoom', { roomId: 'general' });
    await sleep(1000);
  }
  
  console.log('\n');
}

// اختبار معالجة الرسائل
async function testMessageHandling() {
  console.log('📝 اختبار 3: معالجة الرسائل');
  
  await sleep(2000);
  
  const testSocket = connectedSockets[0];
  if (!testSocket) return;
  
  let messageReceived = false;
  let messageCount = 0;
  
  // الاستماع للرسائل
  connectedSockets.forEach(({ socket, user }) => {
    socket.on('message', (data) => {
      if (data.type === 'newMessage' && data.message.content === 'رسالة اختبار') {
        messageCount++;
        if (messageCount === 1) {
          messageReceived = true;
          logResult('messageHandling', 'استقبال الرسالة', true, 
            `تم استقبال الرسالة بنجاح`);
        } else {
          logResult('messageHandling', 'تكرار الرسالة', false, 
            `تم استقبال الرسالة ${messageCount} مرة`);
        }
      }
    });
  });
  
  // إرسال رسالة اختبار
  testSocket.socket.emit('publicMessage', {
    content: 'رسالة اختبار',
    messageType: 'text',
    roomId: 'general'
  });
  
  await sleep(2000);
  
  if (!messageReceived) {
    logResult('messageHandling', 'عدم استقبال الرسالة', false, 
      'لم يتم استقبال الرسالة');
  }
  
  console.log('\n');
}

// اختبار تحديثات قائمة المستخدمين
async function testUserListUpdates() {
  console.log('📝 اختبار 4: تحديثات قائمة المستخدمين');
  
  const testSocket = connectedSockets[0];
  if (!testSocket) return;
  
  let updateCount = 0;
  let lastUpdateTime = Date.now();
  
  testSocket.socket.on('message', (data) => {
    if (data.type === 'onlineUsers') {
      updateCount++;
      const timeDiff = Date.now() - lastUpdateTime;
      
      if (timeDiff < 1000 && updateCount > 1) {
        logResult('userListUpdates', 'تحديث متكرر سريع', false, 
          `تحديث ${updateCount} خلال ${timeDiff}ms`);
      } else {
        logResult('userListUpdates', 'تحديث طبيعي', true, 
          `تحديث ${updateCount} بعد ${timeDiff}ms`);
      }
      lastUpdateTime = Date.now();
    }
  });
  
  // طلب تحديث قائمة المستخدمين عدة مرات
  for (let i = 0; i < 3; i++) {
    testSocket.socket.emit('requestOnlineUsers');
    await sleep(500);
  }
  
  await sleep(3000);
  console.log('\n');
}

// تشغيل جميع الاختبارات
async function runAllTests() {
  try {
    await testAuthentication();
    await testRoomJoining();
    await testMessageHandling();
    await testUserListUpdates();
    
    // عرض النتائج النهائية
    console.log('📊 ملخص نتائج الاختبار:\n');
    
    Object.keys(testResults).forEach(category => {
      const results = testResults[category];
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      
      console.log(`${category}: ${successful}/${total} نجح`);
      
      results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        console.log(`  ${icon} ${result.test}`);
      });
      console.log();
    });
    
    const allResults = Object.values(testResults).flat();
    const totalSuccessful = allResults.filter(r => r.success).length;
    const totalTests = allResults.length;
    
    if (totalSuccessful === totalTests) {
      console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل ممتاز بدون تكرار.');
    } else {
      console.log(`⚠️ ${totalTests - totalSuccessful} اختبار فشل من أصل ${totalTests}`);
    }
    
  } catch (error) {
    console.error('❌ خطأ في تشغيل الاختبارات:', error);
  } finally {
    // إغلاق جميع الاتصالات
    connectedSockets.forEach(({ socket }) => {
      socket.disconnect();
    });
    
    console.log('\n🔌 تم إغلاق جميع الاتصالات');
    process.exit(0);
  }
}

// التحقق من تشغيل الخادم
const testConnection = io(SERVER_URL, { 
  transports: ['websocket'],
  timeout: 3000
});

testConnection.on('connect', () => {
  console.log('✅ الخادم يعمل، بدء الاختبارات...\n');
  testConnection.disconnect();
  runAllTests();
});

testConnection.on('connect_error', (error) => {
  console.error('❌ لا يمكن الاتصال بالخادم. تأكد من تشغيل الخادم على', SERVER_URL);
  console.error('خطأ:', error.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ انتهت مهلة الاتصال بالخادم');
  process.exit(1);
}, 5000);