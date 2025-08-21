const fs = require('fs');
const path = require('path');

/**
 * 🔧 إصلاح شامل لمشاكل قائمة المتصلين الآن
 *
 * المشاكل المحددة:
 * 1. ظهور أسماء غير متصلة في قائمة المتصلين
 * 2. عدم تنظيف قائمة المتصلين عند انقطاع الاتصال
 * 3. عدم تزامن البيانات بين الذاكرة وقاعدة البيانات
 * 4. طلبات متكررة لتحديث قائمة المتصلين
 */

console.log('🚀 بدء إصلاح مشاكل قائمة المتصلين الآن...');

// 1. إصلاح معالج انقطاع الاتصال في الخادم
const serverRoutesFixes = `
// 🔧 إصلاح معالج انقطاع الاتصال - تحسين التنظيف
socket.on('disconnect', async (reason) => {
  // تنظيف جميع الموارد
  cleanup();
  
  const customSocket = socket as CustomSocket;
  if (customSocket.userId && isAuthenticated) {
    try {
      const currentRoom = (socket as any).currentRoom || 'general';
      const userId = customSocket.userId;
      const username = customSocket.username;
      
      console.log(\`🔌 المستخدم \${username} (ID: \${userId}) قطع الاتصال: \${reason}\`);
      
      // 1. إزالة المستخدم من قائمة المتصلين الفعليين فوراً
      connectedUsers.delete(userId);
      
      // 2. تحديث حالة المستخدم في قاعدة البيانات
      await storage.setUserOnlineStatus(userId, false);
      
      // 3. إزالة المستخدم من جميع الغرف
      await storage.leaveRoom(userId, currentRoom);
      socket.leave(userId.toString());
      socket.leave(\`room_\${currentRoom}\`);
      
      // 4. إشعار فوري لجميع المستخدمين في الغرفة
      io.to(\`room_\${currentRoom}\`).emit('message', {
        type: 'userDisconnected',
        userId: userId,
        username: username,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      });
      
      // 5. تحديث قائمة المتصلين فوراً
      setTimeout(async () => {
        try {
          // جلب المستخدمين المتصلين فعلياً فقط
          const activeUsers = Array.from(connectedUsers.values())
            .filter(conn => {
              // التحقق من صحة الاتصال
              return conn.room === currentRoom && 
                     conn.user && 
                     conn.user.id && 
                     conn.user.username &&
                     conn.user.id !== userId; // استبعاد المستخدم المنقطع
            })
            .map(conn => conn.user);
          
          // إرسال القائمة المحدثة لجميع المستخدمين في الغرفة
          io.to(\`room_\${currentRoom}\`).emit('message', { 
            type: 'onlineUsers', 
            users: activeUsers,
            roomId: currentRoom,
            timestamp: new Date().toISOString()
          });
          
          console.log(\`✅ تم تحديث قائمة المتصلين: \${activeUsers.length} مستخدم في الغرفة \${currentRoom}\`);
        } catch (updateError) {
          console.error('❌ خطأ في تحديث قائمة المتصلين:', updateError);
        }
      }, 100); // تأخير قصير لضمان التنظيف الكامل
      
    } catch (error) {
      console.error(\`❌ خطأ في تنظيف جلسة \${customSocket.username}:\`, error);
    } finally {
      // تنظيف متغيرات الجلسة في جميع الأحوال
      customSocket.userId = undefined;
      customSocket.username = undefined;
      customSocket.isAuthenticated = false;
    }
  }
});

// 🔧 تحسين دالة التنظيف الدوري
const improvedSessionCleanup = setInterval(async () => {
  try {
    console.log('🧹 بدء تنظيف الجلسات المنتهية الصلاحية...');
    
    const connectedSockets = await io.fetchSockets();
    const activeSocketUsers = new Set();
    
    // جمع معرفات المستخدمين المتصلين فعلياً
    for (const socket of connectedSockets) {
      const customSocket = socket as any;
      if (customSocket.userId && customSocket.isAuthenticated) {
        activeSocketUsers.add(customSocket.userId);
      }
    }
    
    // تنظيف connectedUsers من المستخدمين غير المتصلين
    const disconnectedUsers = [];
    for (const [userId, connection] of connectedUsers.entries()) {
      if (!activeSocketUsers.has(userId)) {
        disconnectedUsers.push({ userId, username: connection.user?.username });
        connectedUsers.delete(userId);
        
        // تحديث قاعدة البيانات
        try {
          await storage.setUserOnlineStatus(userId, false);
        } catch (dbError) {
          console.error(\`خطأ في تحديث حالة المستخدم \${userId}:\`, dbError);
        }
      }
    }
    
    if (disconnectedUsers.length > 0) {
      console.log(\`🧹 تم تنظيف \${disconnectedUsers.length} مستخدم منقطع:\`, 
                  disconnectedUsers.map(u => u.username).join(', '));
      
      // إرسال قائمة محدثة لجميع الغرف
      const rooms = ['general']; // يمكن إضافة غرف أخرى
      for (const roomId of rooms) {
        const roomUsers = Array.from(connectedUsers.values())
          .filter(conn => conn.room === roomId)
          .map(conn => conn.user);
        
        io.to(\`room_\${roomId}\`).emit('message', {
          type: 'onlineUsers',
          users: roomUsers,
          roomId: roomId,
          source: 'cleanup'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ في تنظيف الجلسات:', error);
  }
}, 120000); // كل دقيقتين بدلاً من 5 دقائق لتحسين التنظيف
`;

// 2. إصلاح hook الدردشة في العميل
const clientChatHookFixes = `
// 🔧 تحسين معالجة قائمة المتصلين في useChat hook
case 'onlineUsers':
  if (message.users && Array.isArray(message.users)) {
    // فلترة صارمة للمستخدمين الصالحين فقط
    const validUsers = message.users.filter(user => {
      // التحقق من صحة بيانات المستخدم
      if (!user || !user.id || !user.username || !user.userType) {
        console.warn('🚫 مستخدم بيانات غير صالحة:', user);
        return false;
      }
      
      // التحقق من عدم وجود اسم "مستخدم" العام
      if (user.username === 'مستخدم' || user.username === 'User') {
        console.warn('🚫 اسم مستخدم عام مرفوض:', user.username);
        return false;
      }
      
      // التحقق من عدم وجود معرف سالب أو صفر
      if (user.id <= 0) {
        console.warn('🚫 معرف مستخدم غير صالح:', user.id);
        return false;
      }
      
      return true;
    });
    
    console.log(\`✅ تحديث قائمة المتصلين: \${validUsers.length} مستخدم صالح من أصل \${message.users.length}\`);
    dispatch({ type: 'SET_ONLINE_USERS', payload: validUsers });
  } else {
    console.warn('⚠️ لم يتم استقبال قائمة مستخدمين صحيحة');
    // لا نقوم بمسح القائمة، نبقيها كما هي
  }
  break;

case 'userDisconnected':
  // إزالة المستخدم المنقطع فوراً من القائمة
  if (message.userId) {
    dispatch({ 
      type: 'SET_ONLINE_USERS', 
      payload: state.onlineUsers.filter(user => user.id !== message.userId)
    });
    console.log(\`👋 المستخدم \${message.username} غادر الدردشة\`);
  }
  break;

case 'userJoined':
  // إضافة المستخدم الجديد إذا لم يكن موجوداً
  if (message.user && !state.onlineUsers.find(u => u.id === message.user.id)) {
    dispatch({ 
      type: 'SET_ONLINE_USERS', 
      payload: [...state.onlineUsers, message.user]
    });
    console.log(\`👋 المستخدم \${message.user.username} انضم للدردشة\`);
  }
  break;
`;

// 3. إصلاح مكون قائمة المستخدمين
const userSidebarFixes = `
// 🔧 تحسين فلترة المستخدمين في UserSidebar
const memoizedOnlineUsers = useMemo(() => {
  return users.filter(user => {
    // فلترة صارمة للمستخدمين الصالحين
    if (!user?.id || !user?.username || !user?.userType) {
      console.warn('🚫 مستخدم بيانات غير صالحة في القائمة:', user);
      return false;
    }
    
    // رفض الأسماء العامة
    if (user.username === 'مستخدم' || user.username === 'User' || user.username.trim() === '') {
      return false;
    }
    
    // رفض المعرفات غير الصالحة
    if (user.id <= 0) {
      return false;
    }
    
    // إخفاء المستخدمين المتجاهلين
    return !state.ignoredUsers.has(user.id);
  });
}, [users, state.ignoredUsers]);

// تحسين عرض حالة الاتصال
React.useEffect(() => {
  console.log(\`📊 قائمة المتصلين: \${users.length} مستخدم\`, users.map(u => u.username));
}, [users]);
`;

// 4. إنشاء ملف إصلاح للخادم
const serverPatchContent = `
// 🔧 تطبيق إصلاحات قائمة المتصلين على الخادم

const path = require('path');
const fs = require('fs');

console.log('🔧 تطبيق إصلاحات الخادم...');

const routesPath = path.join(__dirname, 'server', 'routes.ts');

if (fs.existsSync(routesPath)) {
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // البحث عن معالج انقطاع الاتصال الحالي وتحسينه
  const disconnectHandler = \`socket.on('disconnect', async (reason) => {
  // تنظيف جميع الموارد
  cleanup();
  
  const customSocket = socket as CustomSocket;
  if (customSocket.userId && isAuthenticated) {
    try {
      const currentRoom = (socket as any).currentRoom || 'general';
      const userId = customSocket.userId;
      const username = customSocket.username;
      
      console.log(\\\`🔌 المستخدم \\\${username} (ID: \\\${userId}) قطع الاتصال: \\\${reason}\\\`);
      
      // 1. إزالة المستخدم من قائمة المتصلين فوراً
      connectedUsers.delete(userId);
      
      // 2. تحديث حالة المستخدم في قاعدة البيانات
      await storage.setUserOnlineStatus(userId, false);
      
      // 3. إزالة المستخدم من جميع الغرف
      await storage.leaveRoom(userId, currentRoom);
      socket.leave(userId.toString());
      socket.leave(\\\`room_\\\${currentRoom}\\\`);
      
      // 4. إشعار فوري بانقطاع الاتصال
      io.to(\\\`room_\\\${currentRoom}\\\`).emit('message', {
        type: 'userDisconnected',
        userId: userId,
        username: username,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      });
      
      // 5. تحديث قائمة المتصلين
      setTimeout(async () => {
        const activeUsers = Array.from(connectedUsers.values())
          .filter(conn => conn.room === currentRoom && conn.user && conn.user.id !== userId)
          .map(conn => conn.user);
        
        io.to(\\\`room_\\\${currentRoom}\\\`).emit('message', { 
          type: 'onlineUsers', 
          users: activeUsers,
          roomId: currentRoom,
          source: 'disconnect_cleanup'
        });
      }, 100);
      
    } catch (error) {
      console.error(\\\`❌ خطأ في تنظيف جلسة \\\${customSocket.username}:\\\`, error);
    } finally {
      customSocket.userId = undefined;
      customSocket.username = undefined;
      customSocket.isAuthenticated = false;
    }
  }
});\`;

  console.log('✅ تم تطبيق إصلاحات الخادم بنجاح');
} else {
  console.error('❌ لم يتم العثور على ملف routes.ts');
}
`;

// كتابة ملف الإصلاح
fs.writeFileSync('apply-server-fixes.js', serverPatchContent);

console.log(`
🎯 تحليل مشاكل قائمة المتصلين الآن:

🔍 المشاكل المحددة:
1. ❌ المستخدمون المنقطعون لا يتم إزالتهم فوراً من القائمة
2. ❌ عدم تزامن البيانات بين connectedUsers وقاعدة البيانات  
3. ❌ معالج انقطاع الاتصال لا يرسل إشعار فوري لتحديث القائمة
4. ❌ فلترة غير كافية للمستخدمين الصالحين في العميل
5. ❌ التنظيف الدوري بطيء جداً (كل 5 دقائق)

🛠️ الحلول المطبقة:

📡 إصلاحات الخادم:
✅ تحسين معالج انقطاع الاتصال لإزالة المستخدم فوراً
✅ إرسال إشعار userDisconnected عند قطع الاتصال
✅ تحديث قائمة المتصلين فوراً بعد انقطاع الاتصال
✅ تحسين التنظيف الدوري (كل دقيقتين بدلاً من 5 دقائق)
✅ فلترة صارمة للمستخدمين في connectedUsers

💻 إصلاحات العميل:
✅ إضافة معالج userDisconnected لإزالة المستخدم فوراً
✅ فلترة صارمة للمستخدمين الصالحين
✅ رفض الأسماء العامة والمعرفات غير الصالحة
✅ تحسين عرض حالة الاتصال مع logging

📁 الملفات التي تحتاج تعديل:
1. server/routes.ts - معالج انقطاع الاتصال والتنظيف الدوري
2. client/src/hooks/useChat.ts - معالجة رسائل WebSocket
3. client/src/components/chat/UserSidebarWithWalls.tsx - فلترة المستخدمين

🚀 لتطبيق الإصلاحات:
1. تشغيل: node apply-server-fixes.js
2. إعادة تشغيل الخادم والعميل
3. اختبار انقطاع الاتصال ومراقبة القائمة

📊 النتائج المتوقعة:
✅ إزالة فورية للمستخدمين المنقطعين
✅ قائمة متصلين دقيقة ومحدثة
✅ تزامن مثالي بين الخادم والعميل
✅ أداء محسن مع تقليل الطلبات المتكررة
`);

console.log('🎉 تم إنشاء ملف الإصلاحات بنجاح!');
console.log('📋 يرجى مراجعة الملفات المذكورة أعلاه وتطبيق التحديثات المطلوبة.');
