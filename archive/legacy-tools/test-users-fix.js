const io = require('socket.io-client');

console.log('🧪 اختبار إصلاح قائمة المستخدمين...');

// الاتصال بالخادم المحلي
const socket = io('https://abd-ylo2.onrender.com', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ تم الاتصال بنجاح');

  // تسجيل الدخول كضيف
  socket.emit('auth', {
    userId: 241,
    username: 'قصب',
    userType: 'guest',
  });
});

socket.on('authenticated', (data) => {
  console.log('✅ تمت المصادقة:', data);

  // طلب قائمة المستخدمين بعد ثانية واحدة
  setTimeout(() => {
    console.log('📡 طلب قائمة المستخدمين...');
    socket.emit('requestOnlineUsers');
  }, 1000);
});

socket.on('message', (data) => {
  if (data.type === 'onlineUsers') {
    console.log(`👥 قائمة المستخدمين المتصلين: ${data.users.length} مستخدم`);
    if (data.users.length > 0) {
      console.log('أسماء المستخدمين:', data.users.map((u) => u.username).join(', '));
      console.log('✅ الإصلاح يعمل بنجاح!');
    } else {
      console.log('❌ لا يزال هناك مشكلة - لم يتم جلب أي مستخدمين');
    }
    process.exit(0);
  }
});

socket.on('error', (error) => {
  console.error('❌ خطأ:', error);
  process.exit(1);
});

// إنهاء الاختبار بعد 10 ثوان
setTimeout(() => {
  console.log('⏱️ انتهى وقت الاختبار');
  process.exit(0);
}, 10000);
