import axios from 'axios';
import { io } from 'socket.io-client';

// إعدادات الاختبار
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'Owner',
  password: 'admin123',
  email: 'owner@example.com'
};

let authToken = '';
let socket = null;

// دالة مساعدة للطباعة
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

// دالة مساعدة للانتظار
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// اختبار المصادقة
async function testAuthentication() {
  log('🔐 اختبار المصادقة...');
  
  try {
    // محاولة تسجيل مستخدم جديد (قد يفشل إذا كان موجوداً)
    try {
      const registerData = {
        ...TEST_USER,
        confirmPassword: TEST_USER.password,
        gender: 'male',
        age: 25,
        country: 'Jordan',
        status: 'single',
        relation: 'single'
      };
      
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      log('✅ تم تسجيل المستخدم:', registerResponse.data);
    } catch (registerError) {
      if (registerError.response?.data?.error === 'اسم المستخدم موجود بالفعل') {
        log('ℹ️ المستخدم موجود بالفعل، محاولة تسجيل الدخول...');
      } else {
        throw registerError;
      }
    }
    
    // تسجيل الدخول
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/member`, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });
    
    authToken = loginResponse.data.token;
    log('✅ تم تسجيل الدخول:', { token: authToken.substring(0, 20) + '...' });
    
    return true;
  } catch (error) {
    log('❌ فشل في المصادقة:', error.response?.data || error.message);
    return false;
  }
}

// اختبار إنشاء الغرف
async function testRoomCreation() {
  log('🏠 اختبار إنشاء الغرف...');
  
  try {
    const testRooms = [
      {
        id: 'test-room-1',
        name: 'غرفة اختبار 1',
        description: 'غرفة اختبار عامة',
        isBroadcast: false,
        isPrivate: false,
        maxUsers: 50,
        category: 'اختبار',
        tags: ['اختبار', 'عام']
      },
      {
        id: 'test-broadcast-room',
        name: 'غرفة البث الاختبارية',
        description: 'غرفة بث للاختبار',
        isBroadcast: true,
        isPrivate: false,
        maxUsers: 100,
        category: 'بث',
        tags: ['بث', 'اختبار']
      },
      {
        id: 'test-private-room',
        name: 'غرفة خاصة للاختبار',
        description: 'غرفة خاصة للاختبار',
        isBroadcast: false,
        isPrivate: true,
        maxUsers: 20,
        category: 'خاص',
        tags: ['خاص', 'اختبار']
      }
    ];

    for (const roomData of testRooms) {
      const response = await axios.post(`${BASE_URL}/api/enhanced-rooms`, roomData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(`✅ تم إنشاء الغرفة: ${roomData.name}`, response.data);
    }
    
    return true;
  } catch (error) {
    log('❌ فشل في إنشاء الغرف:', error.response?.data || error.message);
    return false;
  }
}

// اختبار الحصول على الغرف
async function testGetRooms() {
  log('📋 اختبار الحصول على الغرف...');
  
  try {
    // الحصول على جميع الغرف
    const allRoomsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على جميع الغرف:', { count: allRoomsResponse.data.data.length });

    // الحصول على الغرف الشائعة
    const popularRoomsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/popular`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على الغرف الشائعة:', { count: popularRoomsResponse.data.data.length });

    // الحصول على تصنيفات الغرف
    const categoriesResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على تصنيفات الغرف:', categoriesResponse.data);

    // البحث في الغرف
    const searchResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/search?q=اختبار`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم البحث في الغرف:', { count: searchResponse.data.data.length });

    return true;
  } catch (error) {
    log('❌ فشل في الحصول على الغرف:', error.response?.data || error.message);
    return false;
  }
}

// اختبار انضمام وخروج الغرف
async function testRoomMembership() {
  log('👥 اختبار انضمام وخروج الغرف...');
  
  try {
    // الانضمام للغرفة العامة
    const joinGeneralResponse = await axios.post(`${BASE_URL}/api/enhanced-rooms/general/join`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الانضمام للغرفة العامة:', joinGeneralResponse.data);

    // الانضمام لغرفة اختبار
    const joinTestResponse = await axios.post(`${BASE_URL}/api/enhanced-rooms/test-room-1/join`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الانضمام لغرفة الاختبار:', joinTestResponse.data);

    // الحصول على غرف المستخدم
    const myRoomsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/user/my-rooms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على غرف المستخدم:', { count: myRoomsResponse.data.data.length });

    // الحصول على مستخدمي الغرفة
    const roomUsersResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/test-room-1/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على مستخدمي الغرفة:', { count: roomUsersResponse.data.data.length });

    return true;
  } catch (error) {
    log('❌ فشل في اختبار العضوية:', error.response?.data || error.message);
    return false;
  }
}

// اختبار غرف البث
async function testBroadcastRooms() {
  log('📡 اختبار غرف البث...');
  
  try {
    // طلب الميكروفون
    const requestMicResponse = await axios.post(`${BASE_URL}/api/enhanced-rooms/test-broadcast-room/mic/request`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم طلب الميكروفون:', requestMicResponse.data);

    // الحصول على إحصائيات الغرفة
    const statsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/test-broadcast-room/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على إحصائيات الغرفة:', statsResponse.data);

    return true;
  } catch (error) {
    log('❌ فشل في اختبار غرف البث:', error.response?.data || error.message);
    return false;
  }
}

// اختبار Socket.IO
async function testSocketIO() {
  log('🔌 اختبار Socket.IO...');
  
  try {
    // إنشاء اتصال Socket.IO
    socket = io(BASE_URL, {
      auth: {
        token: authToken
      }
    });

    return new Promise((resolve) => {
      socket.on('connect', () => {
        log('✅ تم الاتصال بـ Socket.IO');
        
        // اختبار الانضمام للغرفة عبر Socket
        socket.emit('joinRoom', { roomId: 'general' });
        
        socket.on('roomJoined', (data) => {
          log('✅ تم الانضمام للغرفة عبر Socket:', data);
          
          // اختبار إرسال رسالة
          socket.emit('sendMessage', {
            content: 'مرحباً من الاختبار!',
            roomId: 'general',
            messageType: 'text'
          });
          
          socket.on('newMessage', (data) => {
            log('✅ تم استقبال رسالة جديدة:', data);
            
            // إغلاق الاتصال
            socket.disconnect();
            resolve(true);
          });
        });
      });

      socket.on('error', (error) => {
        log('❌ خطأ في Socket.IO:', error);
        resolve(false);
      });

      // timeout بعد 10 ثوان
      setTimeout(() => {
        log('⏰ انتهت مهلة Socket.IO');
        resolve(false);
      }, 10000);
    });
  } catch (error) {
    log('❌ فشل في اختبار Socket.IO:', error.message);
    return false;
  }
}

// اختبار إدارة النظام (للمشرفين)
async function testAdminFeatures() {
  log('⚙️ اختبار ميزات الإدارة...');
  
  try {
    // فحص صحة قاعدة البيانات
    const healthResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/admin/health`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم فحص صحة قاعدة البيانات:', healthResponse.data);

    // الحصول على إحصائيات قاعدة البيانات
    const statsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/admin/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على إحصائيات قاعدة البيانات:', statsResponse.data);

    // إنشاء نسخة احتياطية
    const backupResponse = await axios.post(`${BASE_URL}/api/enhanced-rooms/admin/backup`, {
      includeUsers: true,
      includeMessages: true,
      includeNotifications: true,
      includeRoomUsers: true,
      compressBackup: false
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم إنشاء نسخة احتياطية:', backupResponse.data);

    // قائمة النسخ الاحتياطية
    const backupsResponse = await axios.get(`${BASE_URL}/api/enhanced-rooms/admin/backups`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم الحصول على قائمة النسخ الاحتياطية:', backupsResponse.data);

    return true;
  } catch (error) {
    log('❌ فشل في اختبار ميزات الإدارة:', error.response?.data || error.message);
    return false;
  }
}

// اختبار التنظيف
async function testCleanup() {
  log('🧹 اختبار التنظيف...');
  
  try {
    // حذف الغرف التجريبية
    const testRooms = ['test-room-1', 'test-broadcast-room', 'test-private-room'];
    
    for (const roomId of testRooms) {
      try {
        await axios.delete(`${BASE_URL}/api/enhanced-rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        log(`✅ تم حذف الغرفة: ${roomId}`);
      } catch (error) {
        log(`⚠️ فشل في حذف الغرفة ${roomId}:`, error.response?.data || error.message);
      }
    }

    // تنظيف البيانات القديمة
    const cleanupResponse = await axios.post(`${BASE_URL}/api/enhanced-rooms/admin/cleanup`, {
      deleteOldMessages: true,
      deleteOldNotifications: true,
      messageAgeDays: 1,
      notificationAgeDays: 1
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    log('✅ تم تنظيف البيانات القديمة:', cleanupResponse.data);

    return true;
  } catch (error) {
    log('❌ فشل في اختبار التنظيف:', error.response?.data || error.message);
    return false;
  }
}

// الاختبار الرئيسي
async function runAllTests() {
  log('🚀 بدء اختبار النظام المحسن للغرف...');
  
  const tests = [
    { name: 'المصادقة', fn: testAuthentication },
    { name: 'إنشاء الغرف', fn: testRoomCreation },
    { name: 'الحصول على الغرف', fn: testGetRooms },
    { name: 'عضوية الغرف', fn: testRoomMembership },
    { name: 'غرف البث', fn: testBroadcastRooms },
    { name: 'Socket.IO', fn: testSocketIO },
    { name: 'ميزات الإدارة', fn: testAdminFeatures },
    { name: 'التنظيف', fn: testCleanup }
  ];

  const results = [];
  
  for (const test of tests) {
    log(`\n📋 بدء اختبار: ${test.name}`);
    const startTime = Date.now();
    
    try {
      const success = await test.fn();
      const duration = Date.now() - startTime;
      
      results.push({
        name: test.name,
        success,
        duration: `${duration}ms`
      });
      
      log(`${success ? '✅' : '❌'} انتهى اختبار ${test.name} في ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({
        name: test.name,
        success: false,
        duration: `${duration}ms`,
        error: error.message
      });
      
      log(`❌ فشل اختبار ${test.name} في ${duration}ms:`, error.message);
    }
    
    // انتظار قليل بين الاختبارات
    await sleep(1000);
  }

  // عرض النتائج النهائية
  log('\n📊 نتائج الاختبار:');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${result.name}: ${result.duration}${result.error ? ` (${result.error})` : ''}`);
  });
  
  log(`\n🎯 النتيجة النهائية: ${passed}/${total} اختبارات نجحت`);
  
  if (passed === total) {
    log('🎉 جميع الاختبارات نجحت! النظام يعمل بشكل مثالي.');
  } else {
    log('⚠️ بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.');
  }
  
  return passed === total;
}

// تشغيل الاختبارات
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log('💥 خطأ غير متوقع:', error);
    process.exit(1);
  });

export {
  runAllTests,
  testAuthentication,
  testRoomCreation,
  testGetRooms,
  testRoomMembership,
  testBroadcastRooms,
  testSocketIO,
  testAdminFeatures,
  testCleanup
};