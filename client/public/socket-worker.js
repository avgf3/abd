/*
 * 🚀 Web Worker محسّن للحفاظ على اتصال Socket.IO في الخلفية
 * يعمل حتى لو توقف JavaScript الرئيسي في التبويب
 */

let pingInterval = null;
let isConnected = false;
let pingIntervalMs = 20000; // 20 ثانية افتراضياً

// 🔥 معالج رسائل واحد فقط - لا تكرار!
self.addEventListener('message', function(event) {
  try {
    const { type, data } = event.data || {};
    
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
        console.log(`🔄 Web Worker: Socket حالة = ${isConnected ? 'متصل' : 'منقطع'}`);
        break;
        
      case 'cleanup':
        // تنظيف الموارد
        cleanup();
        break;
        
      default:
        console.warn('🤔 Web Worker: رسالة غير معروفة:', type);
        break;
    }
  } catch (error) {
    console.error('❌ Web Worker خطأ:', error);
    self.postMessage({
      type: 'worker-error',
      data: { error: error.message || String(error) }
    });
  }
});

/**
 * 🔧 تهيئة Web Worker
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
    
    console.log('🚀 Web Worker للـ Socket.IO جاهز - ping كل', pingIntervalMs, 'ms');
  } catch (error) {
    console.error('❌ خطأ في تهيئة Web Worker:', error);
    self.postMessage({
      type: 'worker-error',
      data: { error: error.message }
    });
  }
}

/**
 * 📡 بدء إرسال ping
 */
function startPing(interval = pingIntervalMs) {
  try {
    // إيقاف ping السابق إن وُجد
    stopPing();
    
    console.log(`🚀 Web Worker: بدء ping كل ${interval}ms`);
    
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
 * ⏹️ إيقاف إرسال ping
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
 * 🧹 تنظيف الموارد
 */
function cleanup() {
  try {
    stopPing();
    isConnected = false;
    
    console.log('🧹 Web Worker: تنظيف الموارد');
    
    // إرسال تأكيد التنظيف
    self.postMessage({
      type: 'worker-cleaned',
      data: {}
    });
    
    // إغلاق Worker
    self.close();
  } catch (error) {
    console.error('❌ خطأ في تنظيف Web Worker:', error);
  }
}

console.log('🔧 Web Worker للـ Socket.IO تم تحميله بنجاح');