import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Metrics
const wsConnectionTime = new Trend('ws_connection_time');
const wsErrors = new Rate('ws_errors');
const wsActiveConnections = new Gauge('ws_active_connections');

const WS_URL = __ENV.WS_URL || 'ws://localhost:10000';

// اختبار تدريجي: 500 -> 1000 -> 1500 -> 2000 -> 2500
export const options = {
  scenarios: {
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // المرحلة 1: 500 متصل
        { duration: '2m', target: 500 },   
        { duration: '3m', target: 500 },   // ثبات 3 دقائق
        
        // المرحلة 2: 1000 متصل  
        { duration: '2m', target: 1000 },  
        { duration: '3m', target: 1000 },  // ثبات 3 دقائق
        
        // المرحلة 3: 1500 متصل
        { duration: '2m', target: 1500 },  
        { duration: '3m', target: 1500 },  // ثبات 3 دقائق
        
        // المرحلة 4: 2000 متصل
        { duration: '2m', target: 2000 },  
        { duration: '3m', target: 2000 },  // ثبات 3 دقائق
        
        // المرحلة 5: 2500 متصل (الهدف النهائي)
        { duration: '2m', target: 2500 },  
        { duration: '5m', target: 2500 },  // ثبات 5 دقائق للاختبار الكامل
        
        // التراجع التدريجي
        { duration: '2m', target: 0 },
      ],
    },
  },
  
  thresholds: {
    // معايير النجاح لكل مرحلة
    ws_connection_time: ['p(95)<3000'],  // زمن اتصال أقل من 3 ثواني
    ws_errors: ['rate<0.1'],             // أخطاء أقل من 10%
    checks: ['rate>0.8'],                // نجاح 80% من الفحوصات
  },
};

export default function () {
  const user = {
    id: `user_${__VU}_${Date.now()}`,
    username: `testuser_${__VU}`,
  };
  
  const connectionStart = Date.now();
  let isConnected = false;
  
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  
  const response = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      const connectionTime = Date.now() - connectionStart;
      wsConnectionTime.add(connectionTime);
      wsActiveConnections.add(1);
      isConnected = true;
      
      // تسجيل المرحلة الحالية
      const currentVUs = __ENV.K6_VUS || __VU;
      if (currentVUs <= 500) {
        console.log(`🟢 مرحلة 1 (500): متصل ${user.username} في ${connectionTime}ms`);
      } else if (currentVUs <= 1000) {
        console.log(`🟡 مرحلة 2 (1000): متصل ${user.username} في ${connectionTime}ms`);
      } else if (currentVUs <= 1500) {
        console.log(`🟠 مرحلة 3 (1500): متصل ${user.username} في ${connectionTime}ms`);
      } else if (currentVUs <= 2000) {
        console.log(`🔴 مرحلة 4 (2000): متصل ${user.username} في ${connectionTime}ms`);
      } else {
        console.log(`🔥 مرحلة 5 (2500): متصل ${user.username} في ${connectionTime}ms`);
      }
    });
    
    socket.on('message', (data) => {
      // Handle Socket.IO protocol
      if (data === '2') {
        socket.send('3'); // Send pong
      } else if (data.startsWith('0')) {
        socket.send('40'); // Connect acknowledgment
      }
    });
    
    socket.on('error', (e) => {
      console.error(`❌ خطأ في ${user.username}: ${e}`);
      wsErrors.add(1);
    });
    
    socket.on('close', () => {
      wsActiveConnections.add(-1);
      isConnected = false;
    });
    
    // Authentication
    socket.setTimeout(() => {
      if (isConnected) {
        socket.send(`42${JSON.stringify(['auth', { 
          userId: user.id, 
          username: user.username 
        }])}`);
      }
    }, 1000);
    
    // Join room
    socket.setTimeout(() => {
      if (isConnected) {
        socket.send(`42${JSON.stringify(['joinRoom', { roomId: 'general' }])}`);
      }
    }, 2000);
    
    // Send occasional message
    socket.setTimeout(() => {
      if (isConnected) {
        socket.send(`42${JSON.stringify(['publicMessage', {
          content: `مرحبا من ${user.username}`,
          roomId: 'general'
        }])}`);
      }
    }, Math.random() * 10000 + 5000); // بين 5-15 ثانية
    
    // Keep alive for test duration
    socket.setTimeout(() => {
      if (isConnected) {
        socket.close();
      }
    }, Math.random() * 60000 + 30000); // بين 30-90 ثانية
  });
  
  check(response, {
    'اتصال ناجح': (r) => r && r.status === 101,
  });
  
  sleep(1);
}

export function setup() {
  console.log('🚀 بدء الاختبار التدريجي:');
  console.log('   مرحلة 1: 500 متصل (5 دقائق)');
  console.log('   مرحلة 2: 1000 متصل (5 دقائق)');
  console.log('   مرحلة 3: 1500 متصل (5 دقائق)');
  console.log('   مرحلة 4: 2000 متصل (5 دقائق)');
  console.log('   مرحلة 5: 2500 متصل (7 دقائق)');
  console.log('   إجمالي: 27 دقيقة');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`✅ انتهى الاختبار في ${duration.toFixed(1)} دقيقة`);
}