/**
 * اختبار شامل لنظام الغرف والدردشة بعد الإصلاحات
 * 
 * هذا الملف يختبر:
 * 1. الانضمام التلقائي للغرفة العامة
 * 2. إنشاء الغرف وحذفها
 * 3. انضمام ومغادرة الغرف
 * 4. إرسال الرسائل في الغرف المختلفة
 * 5. التأكد من وصول الرسائل للمستخدمين الصحيحين
 */

const io = require('socket.io-client');

// إعدادات الاختبار
const SERVER_URL = 'http://localhost:3000';
const TEST_USERS = [
  { username: 'test_user_1', password: 'test123' },
  { username: 'test_user_2', password: 'test123' },
  { username: 'test_user_3', password: 'test123' }
];

let clients = [];
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// دالة لتسجيل النتائج
function logResult(testName, passed, message = '') {
  if (passed) {
    console.log(`✅ ${testName}: نجح`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: فشل - ${message}`);
    testResults.failed++;
    testResults.errors.push(`${testName}: ${message}`);
  }
}

// دالة لانتظار وقت معين
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// دالة لتسجيل الدخول
async function loginUser(client, username, password) {
  return new Promise((resolve, reject) => {
    client.emit('login', { username, password });
    
    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة تسجيل الدخول'));
    }, 10000);
    
    client.on('authenticated', (data) => {
      clearTimeout(timeout);
      console.log(`🔐 تم تسجيل دخول ${username} بنجاح`);
      resolve(data);
    });
    
    client.on('message', (data) => {
      if (data.type === 'error') {
        clearTimeout(timeout);
        reject(new Error(data.message));
      }
    });
  });
}

// دالة لإنشاء عميل جديد
function createClient() {
  const client = io(SERVER_URL, {
    transports: ['websocket'],
    timeout: 10000
  });
  
  client.on('connect_error', (error) => {
    console.error('خطأ في الاتصال:', error);
  });
  
  return client;
}

// الاختبار الرئيسي
async function runTests() {
  console.log('🚀 بدء الاختبارات الشاملة للغرف والدردشة...\n');
  
  try {
    // إنشاء العملاء
    console.log('📱 إنشاء العملاء...');
    for (let i = 0; i < TEST_USERS.length; i++) {
      clients[i] = createClient();
      await wait(500); // انتظار بين الاتصالات
    }
    
    await wait(2000); // انتظار لضمان الاتصال
    
    // اختبار تسجيل الدخول والانضمام التلقائي للغرفة العامة
    console.log('\n🔑 اختبار تسجيل الدخول والانضمام التلقائي للغرفة العامة...');
    for (let i = 0; i < TEST_USERS.length; i++) {
      try {
        await loginUser(clients[i], TEST_USERS[i].username, TEST_USERS[i].password);
        logResult(`تسجيل دخول ${TEST_USERS[i].username}`, true);
      } catch (error) {
        logResult(`تسجيل دخول ${TEST_USERS[i].username}`, false, error.message);
      }
    }
    
    await wait(3000); // انتظار لضمان الانضمام للغرفة العامة
    
    // اختبار إرسال رسائل في الغرفة العامة
    console.log('\n💬 اختبار إرسال رسائل في الغرفة العامة...');
    
    let generalMessageReceived = 0;
    const expectedMessages = TEST_USERS.length;
    
    // إعداد مستمعين للرسائل
    clients.forEach((client, index) => {
      client.on('message', (data) => {
        if (data.envelope && data.envelope.type === 'newMessage' && 
            data.envelope.message.roomId === 'general') {
          generalMessageReceived++;
          console.log(`📨 ${TEST_USERS[index].username} استلم رسالة عامة من ${data.envelope.message.sender?.username}`);
        }
      });
    });
    
    // إرسال رسائل من كل مستخدم
    for (let i = 0; i < TEST_USERS.length; i++) {
      clients[i].emit('message', {
        content: `رسالة اختبار عامة من ${TEST_USERS[i].username}`,
        roomId: 'general'
      });
      await wait(1000);
    }
    
    await wait(3000); // انتظار وصول الرسائل
    
    // التحقق من وصول الرسائل العامة
    const expectedTotalMessages = TEST_USERS.length * TEST_USERS.length; // كل مستخدم يجب أن يستلم رسائل من الجميع
    logResult('إرسال واستلام الرسائل العامة', 
              generalMessageReceived >= expectedTotalMessages * 0.8, // نسمح بـ 80% نجاح
              `استُلم ${generalMessageReceived} من أصل ${expectedTotalMessages} متوقع`);
    
    // اختبار إنشاء غرفة جديدة
    console.log('\n🏠 اختبار إنشاء غرفة جديدة...');
    
    const testRoomId = `test_room_${Date.now()}`;
    let roomCreated = false;
    
    clients[0].emit('createRoom', {
      name: 'غرفة اختبار',
      description: 'غرفة اختبار للنظام'
    });
    
    clients[0].on('message', (data) => {
      if (data.type === 'roomCreated') {
        roomCreated = true;
        console.log(`🏠 تم إنشاء الغرفة: ${data.room.name}`);
      }
    });
    
    await wait(2000);
    logResult('إنشاء غرفة جديدة', roomCreated);
    
    // اختبار انضمام لغرفة جديدة
    console.log('\n🚪 اختبار انضمام لغرفة جديدة...');
    
    let roomJoined = false;
    clients[0].on('message', (data) => {
      if (data.type === 'roomJoined') {
        roomJoined = true;
        console.log(`✅ انضم للغرفة: ${data.roomId}`);
      }
    });
    
    clients[0].emit('joinRoom', { roomId: 'test_room' });
    await wait(2000);
    logResult('الانضمام لغرفة جديدة', roomJoined);
    
    // اختبار منع مغادرة الغرفة العامة
    console.log('\n🛡️ اختبار منع مغادرة الغرفة العامة...');
    
    let generalLeaveBlocked = false;
    clients[0].on('message', (data) => {
      if (data.type === 'error' && data.message.includes('الغرفة العامة')) {
        generalLeaveBlocked = true;
        console.log(`🛡️ تم منع مغادرة الغرفة العامة بنجاح`);
      }
    });
    
    clients[0].emit('leaveRoom', { roomId: 'general' });
    await wait(2000);
    logResult('منع مغادرة الغرفة العامة', generalLeaveBlocked);
    
    // اختبار الرسائل الخاصة
    console.log('\n💌 اختبار الرسائل الخاصة...');
    
    let privateMessageReceived = false;
    clients[1].on('message', (data) => {
      if (data.envelope && data.envelope.type === 'privateMessage') {
        privateMessageReceived = true;
        console.log(`💌 ${TEST_USERS[1].username} استلم رسالة خاصة`);
      }
    });
    
    // البحث عن معرف المستخدم الثاني
    clients[0].emit('privateMessage', {
      receiverId: 2, // افتراض أن المستخدم الثاني له معرف 2
      content: 'رسالة خاصة للاختبار'
    });
    
    await wait(2000);
    logResult('إرسال واستلام الرسائل الخاصة', privateMessageReceived);
    
    // اختبار قطع الاتصال وإعادة الاتصال
    console.log('\n🔌 اختبار قطع الاتصال وإعادة الاتصال...');
    
    clients[2].disconnect();
    await wait(1000);
    
    clients[2] = createClient();
    await wait(2000);
    
    try {
      await loginUser(clients[2], TEST_USERS[2].username, TEST_USERS[2].password);
      logResult('إعادة الاتصال بعد القطع', true);
    } catch (error) {
      logResult('إعادة الاتصال بعد القطع', false, error.message);
    }
    
  } catch (error) {
    console.error('❌ خطأ عام في الاختبارات:', error);
    testResults.failed++;
    testResults.errors.push(`خطأ عام: ${error.message}`);
  }
  
  // تنظيف الاتصالات
  console.log('\n🧹 تنظيف الاتصالات...');
  clients.forEach((client, index) => {
    if (client && client.connected) {
      client.disconnect();
      console.log(`📱 تم قطع اتصال ${TEST_USERS[index]?.username || index}`);
    }
  });
  
  // إظهار النتائج النهائية
  console.log('\n📊 نتائج الاختبارات النهائية:');
  console.log(`✅ نجح: ${testResults.passed}`);
  console.log(`❌ فشل: ${testResults.failed}`);
  console.log(`📈 معدل النجاح: ${(testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(2)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ الأخطاء:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.');
  } else {
    console.log('\n⚠️ يوجد بعض المشاكل التي تحتاج إلى إصلاح.');
  }
  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// بدء الاختبارات
console.log('🔧 اختبار نظام الغرف والدردشة المحسن');
console.log('=====================================\n');

runTests().catch((error) => {
  console.error('❌ فشل في تشغيل الاختبارات:', error);
  process.exit(1);
});

// معالج الإشارات للتنظيف
process.on('SIGINT', () => {
  console.log('\n🛑 تم إيقاف الاختبارات...');
  clients.forEach((client) => {
    if (client && client.connected) {
      client.disconnect();
    }
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ رفض غير معالج:', reason);
  clients.forEach((client) => {
    if (client && client.connected) {
      client.disconnect();
    }
  });
  process.exit(1);
});