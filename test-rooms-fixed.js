import { io } from 'socket.io-client';

// إعدادات الاتصال
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// بيانات المستخدمين للاختبار
const users = [
  { id: 1, username: 'أحمد', userType: 'member' },
  { id: 2, username: 'فاطمة', userType: 'member' }
];

// دالة لإنشاء اتصال مستخدم
function createUserConnection(user) {
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log(`✅ ${user.username} متصل`);
    socket.emit('auth', user);
  });

  socket.on('authenticated', (data) => {
    console.log(`🔐 ${user.username} تم المصادقة:`, data.message);
  });

  socket.on('message', (message) => {
    console.log(`📨 ${user.username} استقبل رسالة:`, message.type);
    
    switch (message.type) {
      case 'roomJoined':
        console.log(`  ✅ انضم للغرفة ${message.roomId}`);
        break;
      case 'newMessage':
        console.log(`  💬 رسالة من ${message.message.sender.username}: ${message.message.content}`);
        break;
      case 'userJoinedRoom':
        console.log(`  👤 ${message.username} انضم للغرفة`);
        break;
      case 'userLeftRoom':
        console.log(`  👋 ${message.username} غادر الغرفة`);
        break;
      case 'onlineUsers':
        console.log(`  👥 المستخدمون المتصلون: ${message.users.map(u => u.username).join(', ')}`);
        break;
    }
  });

  socket.on('error', (error) => {
    console.error(`❌ ${user.username} خطأ:`, error);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 ${user.username} انقطع الاتصال:`, reason);
  });

  return socket;
}

// اختبار النظام
async function testRoomSystem() {
  console.log('🚀 بدء اختبار نظام الغرف...\n');

  // إنشاء اتصالات المستخدمين
  const socket1 = createUserConnection(users[0]);
  const socket2 = createUserConnection(users[1]);

  // انتظار الاتصال
  await new Promise(resolve => setTimeout(resolve, 1000));

  // اختبار 1: انضمام للغرفة العامة
  console.log('\n📝 اختبار 1: انضمام للغرفة العامة');
  socket1.emit('joinRoom', { roomId: 'general' });
  socket2.emit('joinRoom', { roomId: 'general' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // اختبار 2: إرسال رسالة في الغرفة
  console.log('\n📝 اختبار 2: إرسال رسالة');
  socket1.emit('publicMessage', {
    content: 'مرحباً جميعاً!',
    messageType: 'text',
    roomId: 'general'
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // اختبار 3: التبديل بين الغرف
  console.log('\n📝 اختبار 3: التبديل للغرفة الثانية');
  socket1.emit('joinRoom', { roomId: 'music' });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // اختبار 4: إرسال رسالة في غرفة مختلفة
  console.log('\n📝 اختبار 4: إرسال رسالة في غرفة الموسيقى');
  socket1.emit('publicMessage', {
    content: 'أهلاً في غرفة الموسيقى!',
    messageType: 'text',
    roomId: 'music'
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // اختبار 5: التأكد من عدم وصول الرسالة للمستخدم في غرفة أخرى
  console.log('\n📝 اختبار 5: التحقق من فصل الرسائل بين الغرف');
  socket2.emit('publicMessage', {
    content: 'هذه رسالة في الغرفة العامة',
    messageType: 'text',
    roomId: 'general'
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  // إنهاء الاختبار
  console.log('\n✅ انتهى الاختبار!');
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

// تشغيل الاختبار
testRoomSystem().catch(console.error);