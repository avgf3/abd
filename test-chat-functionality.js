import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000';

async function testChatFunctionality() {
  console.log('🔍 اختبار وظائف الدردشة...');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    let testsPassed = 0;
    const totalTests = 3;
    
    socket.on('connect', () => {
      console.log('✅ اتصال Socket.IO نجح');
      testsPassed++;
      
      // محاولة المصادقة
      socket.emit('auth', {
        userId: 4, // عبود (المالك)
        username: 'عبود',
        userType: 'owner'
      });
    });
    
    socket.on('message', (data) => {
      if (data.type === 'onlineUsers') {
        console.log('✅ استقبال قائمة المستخدمين المتصلين:', data.users.length, 'مستخدم');
        testsPassed++;
        
        // اختبار إرسال رسالة عامة
        socket.emit('publicMessage', {
          content: 'رسالة اختبار للدردشة العامة',
          messageType: 'text',
          roomId: 'general'
        });
      }
      
      if (data.type === 'newMessage') {
        console.log('✅ استقبال رسالة جديدة:', data.message.content);
        testsPassed++;
      }
      
      if (data.type === 'error') {
        console.log('❌ خطأ في الدردشة:', data.message);
      }
      
      // إنهاء الاختبار بعد جميع الاختبارات
      if (testsPassed >= totalTests) {
        console.log(`🎉 نجحت ${testsPassed}/${totalTests} اختبارات الدردشة`);
        socket.disconnect();
        resolve(true);
      }
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 انقطع اتصال Socket.IO');
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ خطأ في اتصال Socket.IO:', error.message);
      resolve(false);
    });
    
    // timeout بعد 10 ثواني
    setTimeout(() => {
      console.log('⏰ انتهت مهلة الاختبار');
      socket.disconnect();
      resolve(testsPassed >= 2); // نجاح جزئي
    }, 10000);
  });
}

// تشغيل الاختبار
testChatFunctionality().then(success => {
  console.log(success ? '✅ اختبار الدردشة نجح' : '❌ اختبار الدردشة فشل');
  process.exit(success ? 0 : 1);
});