import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for WebSocket
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsErrors = new Rate('ws_errors');
const wsActiveConnections = new Gauge('ws_active_connections');
const wsMessageLatency = new Trend('ws_message_latency');

// Configuration
const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Test messages
const testMessages = [
    { type: 'message:send', data: { content: 'مرحبا من اختبار WebSocket', roomId: 'general' } },
    { type: 'message:send', data: { content: 'Hello from WebSocket test', roomId: 'general' } },
    { type: 'message:typing', data: { roomId: 'general', isTyping: true } },
    { type: 'message:typing', data: { roomId: 'general', isTyping: false } },
    { type: 'user:status', data: { status: 'online' } },
    { type: 'user:status', data: { status: 'away' } },
    { type: 'room:join', data: { roomId: 'general' } },
    { type: 'room:join', data: { roomId: 'random' } },
];

// Scenarios
export const options = {
    scenarios: {
        // WebSocket connection test
        wsConnection: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 100 },   // Ramp up to 100 connections
                { duration: '5m', target: 500 },   // Ramp up to 500 connections
                { duration: '5m', target: 1000 },  // Ramp up to 1000 connections
                { duration: '5m', target: 1000 },  // Maintain 1000 connections
                { duration: '3m', target: 0 },     // Ramp down
            ],
        },
        
        // WebSocket message load test
        wsMessageLoad: {
            executor: 'constant-vus',
            vus: 200,
            duration: '30m',
        },
        
        // WebSocket spike test
        wsSpike: {
            executor: 'ramping-vus',
            startVUs: 50,
            stages: [
                { duration: '1m', target: 50 },    // Warm up
                { duration: '30s', target: 1000 }, // Spike
                { duration: '2m', target: 1000 },  // Maintain spike
                { duration: '30s', target: 50 },   // Drop
                { duration: '2m', target: 50 },    // Recovery
            ],
        },
    },
    
    thresholds: {
        ws_connection_time: ['p(95)<1000', 'p(99)<3000'],
        ws_message_latency: ['p(50)<50', 'p(95)<200'],
        ws_errors: ['rate<0.01'],
    },
};

// Helper function to generate user
function generateUser() {
    return {
        id: `user_${randomString(8)}`,
        username: `testuser_${randomString(6)}`,
        token: AUTH_TOKEN || `mock_token_${randomString(16)}`,
    };
}

// Main WebSocket test
export default function () {
    const user = generateUser();
    const connectionStart = Date.now();
    let messageTimestamps = {};
    let isConnected = false;
    
    const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
    
    const params = {
        headers: {
            'Authorization': `Bearer ${user.token}`,
        },
        tags: { user: user.id },
    };
    
    const response = ws.connect(url, params, function (socket) {
        // Connection established
        socket.on('open', () => {
            const connectionTime = Date.now() - connectionStart;
            wsConnectionTime.add(connectionTime);
            wsActiveConnections.add(1);
            isConnected = true;
            
            console.log(`✅ WebSocket connected for ${user.username} in ${connectionTime}ms`);
            
            // Send initial authentication
            socket.send(JSON.stringify({
                type: 'auth',
                data: {
                    token: user.token,
                    userId: user.id,
                    username: user.username,
                }
            }));
        });
        
        // Handle incoming messages
        socket.on('message', (data) => {
            wsMessagesReceived.add(1);
            
            try {
                const message = JSON.parse(data);
                
                // Calculate latency for echo messages
                if (message.type === 'message:echo' && message.id) {
                    if (messageTimestamps[message.id]) {
                        const latency = Date.now() - messageTimestamps[message.id];
                        wsMessageLatency.add(latency);
                        delete messageTimestamps[message.id];
                    }
                }
                
                // Handle different message types
                switch (message.type) {
                    case 'auth:success':
                        console.log(`🔐 Authentication successful for ${user.username}`);
                        break;
                    case 'message:received':
                        // Message was received by server
                        break;
                    case 'user:joined':
                        // Another user joined
                        break;
                    case 'user:left':
                        // Another user left
                        break;
                    case 'room:joined':
                        console.log(`📍 Joined room: ${message.roomId}`);
                        break;
                    case 'error':
                        console.error(`❌ Error: ${message.message}`);
                        wsErrors.add(1);
                        break;
                }
            } catch (e) {
                // Handle non-JSON messages (like Socket.IO protocol messages)
                if (data.startsWith('0')) {
                    // Socket.IO connect message
                    socket.send('40'); // Send Socket.IO connect acknowledgment
                } else if (data === '2') {
                    // Socket.IO ping
                    socket.send('3'); // Send pong
                }
            }
        });
        
        // Handle errors
        socket.on('error', (e) => {
            console.error(`❌ WebSocket error for ${user.username}: ${e}`);
            wsErrors.add(1);
        });
        
        // Handle close
        socket.on('close', () => {
            wsActiveConnections.add(-1);
            isConnected = false;
            console.log(`👋 WebSocket closed for ${user.username}`);
        });
        
        // Simulate user activity
        socket.setTimeout(() => {
            // Join a room
            const joinMessage = {
                type: 'room:join',
                data: {
                    roomId: 'general',
                    userId: user.id,
                }
            };
            socket.send(`42${JSON.stringify(['room:join', joinMessage.data])}`);
            wsMessagesSent.add(1);
        }, 1000);
        
        // Send messages periodically
        let messageCount = 0;
        const messageInterval = setInterval(() => {
            if (!isConnected || messageCount >= 20) {
                clearInterval(messageInterval);
                return;
            }
            
            const message = randomItem(testMessages);
            const messageId = `${user.id}_${Date.now()}_${randomString(6)}`;
            
            // Store timestamp for latency calculation
            messageTimestamps[messageId] = Date.now();
            
            // Send message in Socket.IO format
            const socketMessage = {
                id: messageId,
                ...message,
                userId: user.id,
                timestamp: Date.now(),
            };
            
            socket.send(`42${JSON.stringify([message.type, socketMessage])}`);
            wsMessagesSent.add(1);
            messageCount++;
            
            // Simulate typing indicator
            if (Math.random() > 0.7) {
                socket.send(`42${JSON.stringify(['message:typing', {
                    roomId: 'general',
                    userId: user.id,
                    isTyping: true,
                }])}`);
                
                setTimeout(() => {
                    socket.send(`42${JSON.stringify(['message:typing', {
                        roomId: 'general',
                        userId: user.id,
                        isTyping: false,
                    }])}`);
                }, 2000);
            }
            
        }, randomIntBetween(2000, 5000));
        
        // Simulate presence updates
        const presenceInterval = setInterval(() => {
            if (!isConnected) {
                clearInterval(presenceInterval);
                return;
            }
            
            const status = randomItem(['online', 'away', 'busy']);
            socket.send(`42${JSON.stringify(['user:status', {
                userId: user.id,
                status: status,
                timestamp: Date.now(),
            }])}`);
            wsMessagesSent.add(1);
            
        }, randomIntBetween(10000, 30000));
        
        // Keep connection alive for test duration
        socket.setTimeout(() => {
            clearInterval(messageInterval);
            clearInterval(presenceInterval);
            socket.close();
        }, randomIntBetween(30000, 120000)); // 30s to 2min
    });
    
    // Check connection result
    check(response, {
        'WebSocket connection successful': (r) => r && r.status === 101,
    });
    
    // Wait for connection to complete
    sleep(1);
}

// Setup function
export function setup() {
    console.log(`🚀 Starting WebSocket load test`);
    console.log(`📍 Target URL: ${WS_URL}`);
    
    return { startTime: Date.now() };
}

// Teardown function
export function teardown(data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log(`✅ WebSocket test completed in ${duration} seconds`);
    console.log(`📊 Summary:`);
    console.log(`   - Messages sent: ${wsMessagesSent.value}`);
    console.log(`   - Messages received: ${wsMessagesReceived.value}`);
    console.log(`   - Error rate: ${wsErrors.value * 100}%`);
}

// Helper function
function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}