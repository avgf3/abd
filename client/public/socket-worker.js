/**
 * Web Worker للحفاظ على اتصال Socket.IO في الخلفية
 * يعمل حتى لو توقف JavaScript الرئيسي في التبويب
 */

let pingInterval = null;
let socketInstance = null;
let isConnected = false;
let pingIntervalMs = 20000; // 20 ثانية افتراضياً

// استقبال الرسائل من التطبيق الرئيسي
self.addEventListener('message', function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'init':
      // تهيئة Web Worker مع إعدادات Socket.IO
      initSocketWorker(data);
      break;
      
    case 'start-ping':
      // بدء إرسال ping
      startPing(data?.interval || pingIntervalMs);
      break;
      
    case 'stop-ping':
      // إيقاف إرسال ping
      stopPing();
      break;
      
    case 'update-interval':
      // تحديث فترة ping
      pingIntervalMs = data?.interval || pingIntervalMs;
      if (pingInterval) {
        stopPing();
        startPing(pingIntervalMs);
      }
      break;
      
    case 'socket-status':
      // تحديث حالة Socket
      isConnected = data?.connected || false;
      break;
      
    case 'cleanup':
      // تنظيف الموارد
      cleanup();
      break;
  }
});

/**
 * تهيئة Web Worker
 */
function initSocketWorker(config) {
  try {
    // إعدادات افتراضية
    pingIntervalMs = config?.pingInterval || 20000;
    
    // إرسال تأكيد التهيئة
    self.postMessage({
      type: 'worker-ready',
      data: { pingInterval: pingIntervalMs }
    });
    
    console.log('🔧 Web Worker للـ Socket.IO جاهز');
  } catch (error) {
    console.error('❌ خطأ في تهيئة Web Worker:', error);
    self.postMessage({
      type: 'worker-error',
      data: { error: error.message }
    });
  }
}

/**
 * بدء إرسال ping
 */
function startPing(interval = pingIntervalMs) {
  try {
    // إيقاف ping السابق إن وُجد
    stopPing();
    
    pingInterval = setInterval(() => {
      if (isConnected) {
        // إرسال ping للخادم عبر التطبيق الرئيسي
        self.postMessage({
          type: 'send-ping',
          data: { timestamp: Date.now() }
        });
        
        console.log('📡 Web Worker: إرسال ping للخادم');
      } else {
        console.log('⚠️ Web Worker: Socket غير متصل - تخطي ping');
      }
    }, interval);
    
    console.log(`🚀 Web Worker: بدء ping كل ${interval}ms`);
    
    // إرسال تأكيد البدء
    self.postMessage({
      type: 'ping-started',
      data: { interval }
    });
    
  } catch (error) {
    console.error('❌ خطأ في بدء ping:', error);
    self.postMessage({
      type: 'ping-error',
      data: { error: error.message }
    });
  }
}

/**
 * إيقاف إرسال ping
 */
function stopPing() {
  try {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
      console.log('⏹️ Web Worker: إيقاف ping');
      
      // إرسال تأكيد الإيقاف
      self.postMessage({
        type: 'ping-stopped',
        data: {}
      });
    }
  } catch (error) {
    console.error('❌ خطأ في إيقاف ping:', error);
  }
}

/**
 * تنظيف الموارد
 */
function cleanup() {
  try {
    stopPing();
    isConnected = false;
    socketInstance = null;
    
    console.log('🧹 Web Worker: تنظيف الموارد');
    
    // إرسال تأكيد التنظيف
    self.postMessage({
      type: 'worker-cleaned',
      data: {}
    });
  } catch (error) {
    console.error('❌ خطأ في تنظيف Web Worker:', error);
  }
}

// ملاحظة: Web Worker لا يطلق beforeunload دائماً، لذا نعتمد على رسالة cleanup من التطبيق الرئيسي

console.log('🔧 Web Worker للـ Socket.IO تم تحميله');