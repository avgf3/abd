/*
 * Lightweight Web Worker for background heartbeat when the page is hidden.
 * It does NOT open any network connection by itself. Instead, it periodically
 * posts a message to the main thread requesting a ping, which allows the page
 * to emit a Socket.IO event (client_ping) if connected.
 */

let intervalId = null;
let connected = false;
let defaultIntervalMs = 60000; // 60s, conservative for background

function clearTimer() {
  if (intervalId !== null) {
    try { clearInterval(intervalId); } catch {}
    intervalId = null;
  }
}

function startTimer(intervalMs) {
  clearTimer();
  const ms = Number(intervalMs) > 0 ? Number(intervalMs) : defaultIntervalMs;
  intervalId = setInterval(() => {
    // Only prompt a ping when the socket is known to be connected
    if (connected) {
      try {
        postMessage({ type: 'send-ping', data: { ts: Date.now() } });
      } catch {}
    }
  }, ms);
}

self.onmessage = (evt) => {
  try {
    const { type, data } = evt.data || {};
    switch (type) {
      case 'init':
        if (data && typeof data.pingInterval === 'number') {
          defaultIntervalMs = data.pingInterval;
        }
        try { postMessage({ type: 'worker-ready' }); } catch {}
        break;
      case 'socket-status':
        connected = !!(data && data.connected);
        break;
      case 'start-ping':
        startTimer((data && data.interval) || defaultIntervalMs);
        break;
      case 'stop-ping':
        clearTimer();
        break;
      case 'cleanup':
        clearTimer();
        // Best-effort: no explicit terminate from inside the worker
        break;
      default:
        // Unknown message; ignore
        break;
    }
  } catch (error) {
    try { postMessage({ type: 'worker-error', data: { error: String(error && error.message || error) } }); } catch {}
  }
};

/* Lightweight Web Worker to send periodic pings while page is in background */
let pingIntervalId = null;
let configuredInterval = 60000; // default 60s

self.onmessage = (event) => {
  try {
    const { type, data } = event.data || {};
    switch (type) {
      case 'init': {
        if (data && typeof data.pingInterval === 'number') {
          configuredInterval = Math.max(15000, data.pingInterval | 0);
        }
        self.postMessage({ type: 'worker-ready' });
        break;
      }
      case 'start-ping': {
        const interval = (data && data.interval) ? data.interval : configuredInterval;
        startPing(Math.max(15000, interval | 0));
        break;
      }
      case 'stop-ping': {
        stopPing();
        break;
      }
      case 'socket-status': {
        // no-op: reserved for potential future logic
        break;
      }
      case 'cleanup': {
        stopPing();
        close();
        break;
      }
    }
  } catch (e) {
    self.postMessage({ type: 'worker-error', error: (e && e.message) || String(e) });
  }
};

function startPing(interval) {
  try {
    stopPing();
    pingIntervalId = setInterval(() => {
      try {
        self.postMessage({ type: 'send-ping' });
      } catch {}
    }, interval);
  } catch (e) {
    self.postMessage({ type: 'worker-error', error: (e && e.message) || String(e) });
  }
}

function stopPing() {
  try {
    if (pingIntervalId) {
      clearInterval(pingIntervalId);
      pingIntervalId = null;
    }
  } catch {}
}

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