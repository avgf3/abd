import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsErrors = new Rate('ws_errors');
const wsActiveConnections = new Gauge('ws_active_connections');
const wsMessageLatency = new Trend('ws_message_latency');

// Configuration
const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';
const TARGET_USERS = 2500;

// Test scenario for 2500 concurrent users
export const options = {
  scenarios: {
    // اختبار 2500 متصل تدريجي
    load_test_2500: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },   // الوصول لـ 500
        { duration: '3m', target: 1000 },  // الوصول لـ 1000
        { duration: '3m', target: 1500 },  // الوصول لـ 1500
        { duration: '3m', target: 2000 },  // الوصول لـ 2000
        { duration: '2m', target: 2500 },  // الوصول لـ 2500
        { duration: '10m', target: 2500 }, // الثبات على 2500 لمدة 10 دقائق
        { duration: '3m', target: 0 },     // التراجع التدريجي
      ],
    },
  },
  
  thresholds: {
    // معايير النجاح لـ 2500 متصل
    ws_connection_time: ['p(95)<2000', 'p(99)<5000'], // زمن الاتصال
    ws_message_latency: ['p(50)<100', 'p(95)<500'],   // زمن الاستجابة
    ws_errors: ['rate<0.05'], // معدل أخطاء أقل من 5%
    checks: ['rate>0.90'],    // نجاح 90% من الفحوصات
  },
};

// Test messages
const testMessages = [
  'مرحبا من اختبار الأحمال العالية',
  'Hello from load test',
  'اختبار 2500 متصل متزامن',
  'Testing high load capacity',
  '🚀 اختبار الأداء',
];

export default function () {
  const user = {
    id: `user_${__VU}_${randomString(8)}`,
    username: `testuser_${__VU}`,
  };
  
  const connectionStart = Date.now();
  let messageTimestamps = {};
  let isConnected = false;
  let messageCount = 0;
  
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  
  const response = ws.connect(url, {}, function (socket) {
    // Connection established
    socket.on('open', () => {
      const connectionTime = Date.now() - connectionStart;
      wsConnectionTime.add(connectionTime);
      wsActiveConnections.add(1);
      isConnected = true;
      
      console.log(`✅ متصل: ${user.username} في ${connectionTime}ms`);
    });
    
    // Handle messages
    socket.on('message', (data) => {
      wsMessagesReceived.add(1);
      
      try {
        const message = JSON.parse(data);
        
        // Calculate latency
        if (message.id && messageTimestamps[message.id]) {
          const latency = Date.now() - messageTimestamps[message.id];
          wsMessageLatency.add(latency);
          delete messageTimestamps[message.id];
        }
        
        // Handle Socket.IO protocol
        if (data === '2') {
          socket.send('3'); // Send pong
        } else if (data.startsWith('0')) {
          socket.send('40'); // Connect acknowledgment
        }
      } catch (e) {
        // Handle non-JSON messages
        if (data === '2') {
          socket.send('3');
        }
      }
    });
    
    // Handle errors
    socket.on('error', (e) => {
      console.error(`❌ خطأ WebSocket: ${user.username}: ${e}`);
      wsErrors.add(1);
    });
    
    // Handle close
    socket.on('close', () => {
      wsActiveConnections.add(-1);
      isConnected = false;
      console.log(`👋 انقطع الاتصال: ${user.username}`);
    });
    
    // Authenticate after connection
    socket.setTimeout(() => {
      if (isConnected) {
        const authMessage = JSON.stringify({
          type: 'auth',
          userId: user.id,
          username: user.username,
        });
        socket.send(`42${authMessage}`);
      }
    }, 1000);
    
    // Join room
    socket.setTimeout(() => {
      if (isConnected) {
        const joinMessage = JSON.stringify(['joinRoom', { roomId: 'general' }]);
        socket.send(`42${joinMessage}`);
      }
    }, 2000);
    
    // Send messages periodically
    const messageInterval = setInterval(() => {
      if (!isConnected || messageCount >= 10) {
        clearInterval(messageInterval);
        return;
      }
      
      const content = randomItem(testMessages);
      const messageId = `${user.id}_${Date.now()}_${messageCount}`;
      
      messageTimestamps[messageId] = Date.now();
      
      const message = JSON.stringify(['publicMessage', {
        id: messageId,
        content: content,
        roomId: 'general',
        userId: user.id,
      }]);
      
      socket.send(`42${message}`);
      wsMessagesSent.add(1);
      messageCount++;
      
    }, randomIntBetween(5000, 15000)); // رسالة كل 5-15 ثانية
    
    // Keep connection alive for test duration
    socket.setTimeout(() => {
      clearInterval(messageInterval);
      if (isConnected) {
        socket.close();
      }
    }, randomIntBetween(60000, 180000)); // البقاء متصل لمدة 1-3 دقائق
  });
  
  // Check connection result
  check(response, {
    'اتصال WebSocket ناجح': (r) => r && r.status === 101,
  });
  
  sleep(1);
}

// Setup function
export function setup() {
  console.log(`🚀 بدء اختبار ${TARGET_USERS} متصل متزامن`);
  console.log(`📍 الهدف: ${WS_URL}`);
  
  return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`✅ اكتمل الاختبار في ${duration} ثانية`);
  console.log(`📊 الملخص:`);
  console.log(`   - الرسائل المرسلة: ${wsMessagesSent.value}`);
  console.log(`   - الرسائل المستلمة: ${wsMessagesReceived.value}`);
  console.log(`   - معدل الأخطاء: ${(wsErrors.value * 100).toFixed(2)}%`);
}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}