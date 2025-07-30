const io = require('socket.io-client');

// محاكاة مستخدمين مختلفين
const users = [
  { id: 1, username: 'احمد', token: 'test-token-1' },
  { id: 2, username: 'فاطمة', token: 'test-token-2' },
  { id: 3, username: 'محمد', token: 'test-token-3' }
];

const sockets = [];
let connectedCount = 0;

console.log('🧪 بدء اختبار مشكلة المستخدمين المتصلين...\n');

// دالة لإنشاء اتصال مستخدم
function createUserConnection(user, delay = 0) {
  setTimeout(() => {
    console.log(`🔗 محاولة اتصال ${user.username}...`);
    
    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log(`✅ ${user.username} متصل (Socket ID: ${socket.id})`);
      connectedCount++;
      
      // إرسال بيانات المستخدم
      socket.emit('authenticate', {
        token: user.token,
        userId: user.id,
        username: user.username
      });
    });

    socket.on('connected', (data) => {
      console.log(`🎉 ${user.username} تم التحقق من الهوية:`, data.message);
      
      // طلب قائمة المستخدمين المتصلين
      console.log(`📋 ${user.username} يطلب قائمة المستخدمين المتصلين...`);
      socket.emit('requestOnlineUsers');
    });

    socket.on('message', (message) => {
      if (message.type === 'onlineUsers') {
        console.log(`\n👥 ${user.username} استقبل قائمة المستخدمين:`);
        console.log(`   عدد المستخدمين: ${message.users ? message.users.length : 0}`);
        if (message.users && message.users.length > 0) {
          message.users.forEach(u => {
            console.log(`   - ${u.username} (ID: ${u.id})`);
          });
        } else {
          console.log('   ❌ لا توجد قائمة مستخدمين أو القائمة فارغة');
        }
        console.log('');
      } else if (message.type === 'userJoined') {
        console.log(`👤 ${user.username} تم إشعاره بانضمام: ${message.user?.username}`);
      }
    });

    socket.on('onlineUsers', (data) => {
      console.log(`\n👥 ${user.username} استقبل قائمة المستخدمين (onlineUsers event):`);
      console.log(`   عدد المستخدمين: ${data.users ? data.users.length : 0}`);
      if (data.users && data.users.length > 0) {
        data.users.forEach(u => {
          console.log(`   - ${u.username} (ID: ${u.id})`);
        });
      }
      console.log('');
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${user.username} انقطع الاتصال`);
      connectedCount--;
    });

    socket.on('error', (error) => {
      console.log(`🚨 ${user.username} خطأ:`, error);
    });

    sockets.push({ socket, user });
  }, delay);
}

// اختبار الاتصال المتتالي
console.log('📡 اختبار 1: اتصال المستخدمين بشكل متتالي...\n');

// اتصال المستخدم الأول
createUserConnection(users[0], 1000);

// اتصال المستخدم الثاني بعد 3 ثواني
createUserConnection(users[1], 4000);

// اتصال المستخدم الثالث بعد 6 ثواني
createUserConnection(users[2], 7000);

// تنظيف الاتصالات بعد 15 ثانية
setTimeout(() => {
  console.log('\n🔄 إغلاق جميع الاتصالات...');
  sockets.forEach(({ socket, user }) => {
    socket.disconnect();
    console.log(`🔌 تم إغلاق اتصال ${user.username}`);
  });
  
  setTimeout(() => {
    console.log('\n📊 ملخص الاختبار:');
    console.log(`- عدد المستخدمين المختبرين: ${users.length}`);
    console.log(`- عدد الاتصالات المتبقية: ${connectedCount}`);
    console.log('\n✅ انتهى الاختبار');
    process.exit(0);
  }, 2000);
}, 15000);

// معالجة إيقاف البرنامج
process.on('SIGINT', () => {
  console.log('\n🛑 إيقاف الاختبار...');
  sockets.forEach(({ socket }) => socket.disconnect());
  process.exit(0);
});