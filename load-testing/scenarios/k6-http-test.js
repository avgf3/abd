import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const messageDuration = new Trend('message_duration');
const successfulLogins = new Counter('successful_logins');
const activeUsers = new Gauge('active_users');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SCENARIO = __ENV.SCENARIO || 'rampUp';

// Test data
const testMessages = [
    'مرحبا، كيف حالك؟',
    'Hello, how are you?',
    'هذه رسالة اختبارية',
    'This is a test message',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'السلام عليكم ورحمة الله وبركاته',
    'Quick test message',
    '🚀 Performance test in progress...',
    'Testing Arabic: مرحبا بالعالم',
    'Testing emojis: 😀 🎉 🔥 💯'
];

// Scenarios configuration
export const options = {
    scenarios: {
        // Scenario 1: Ramp-up test
        rampUp: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5m', target: 100 },   // Ramp up to 100 users
                { duration: '10m', target: 500 },  // Ramp up to 500 users
                { duration: '10m', target: 1000 }, // Ramp up to 1000 users
                { duration: '5m', target: 1000 },  // Stay at 1000 users
                { duration: '5m', target: 0 },     // Ramp down to 0 users
            ],
            gracefulRampDown: '30s',
        },
        
        // Scenario 2: Steady load test
        steadyLoad: {
            executor: 'constant-vus',
            vus: 500,
            duration: '60m',
        },
        
        // Scenario 3: Spike test
        spike: {
            executor: 'ramping-vus',
            startVUs: 100,
            stages: [
                { duration: '2m', target: 100 },   // Warm up
                { duration: '30s', target: 2000 }, // Spike to 2000 users
                { duration: '2m', target: 2000 },  // Stay at 2000
                { duration: '30s', target: 100 },  // Scale down
                { duration: '2m', target: 100 },   // Recovery
            ],
        },
        
        // Scenario 4: Stress test
        stress: {
            executor: 'ramping-arrival-rate',
            startRate: 50,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 5000,
            stages: [
                { duration: '5m', target: 100 },
                { duration: '5m', target: 500 },
                { duration: '5m', target: 1000 },
                { duration: '5m', target: 2000 },
                { duration: '5m', target: 3000 },
            ],
        },
    },
    
    // Thresholds
    thresholds: {
        http_req_duration: ['p(50)<100', 'p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'], // Error rate < 1%
        errors: ['rate<0.01'],
        login_duration: ['p(95)<1000'],
        message_duration: ['p(95)<200'],
    },
};

// Helper functions
function generateUser() {
    const userId = `user_${randomString(8)}`;
    return {
        username: userId,
        email: `${userId}@test.com`,
        password: 'Test@123456',
        fullName: `Test User ${userId}`,
    };
}

function getCookies(response) {
    const cookies = {};
    const setCookieHeaders = response.headers['Set-Cookie'];
    
    if (setCookieHeaders) {
        const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        cookieArray.forEach(cookie => {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');
            cookies[name] = value;
        });
    }
    
    return cookies;
}

// Test setup
export function setup() {
    console.log(`🚀 Starting load test: ${SCENARIO}`);
    console.log(`📍 Target URL: ${BASE_URL}`);
    
    // Health check
    const healthCheck = http.get(`${BASE_URL}/api/health`);
    check(healthCheck, {
        'Health check passed': (r) => r.status === 200,
    });
    
    if (healthCheck.status !== 200) {
        throw new Error('Server health check failed!');
    }
    
    return { startTime: Date.now() };
}

// Main test function
export default function () {
    const user = generateUser();
    let authToken = null;
    let sessionCookie = null;
    
    group('Authentication Flow', () => {
        // Register new user
        group('Register', () => {
            const registerPayload = JSON.stringify({
                username: user.username,
                email: user.email,
                password: user.password,
                fullName: user.fullName,
            });
            
            const registerParams = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            
            const registerRes = http.post(
                `${BASE_URL}/api/auth/register`,
                registerPayload,
                registerParams
            );
            
            const registerSuccess = check(registerRes, {
                'Register status 201': (r) => r.status === 201,
                'Register has user data': (r) => r.json('user') !== null,
            });
            
            if (!registerSuccess) {
                errorRate.add(1);
            }
        });
        
        sleep(1);
        
        // Login
        group('Login', () => {
            const loginPayload = JSON.stringify({
                username: user.username,
                password: user.password,
            });
            
            const loginParams = {
                headers: {
                    'Content-Type': 'application/json',
                },
                tags: { name: 'Login' },
            };
            
            const loginRes = http.post(
                `${BASE_URL}/api/auth/login`,
                loginPayload,
                loginParams
            );
            
            loginDuration.add(loginRes.timings.duration);
            
            const loginSuccess = check(loginRes, {
                'Login status 200': (r) => r.status === 200,
                'Login has token': (r) => r.json('token') !== null,
                'Login has user': (r) => r.json('user') !== null,
            });
            
            if (loginSuccess) {
                successfulLogins.add(1);
                activeUsers.add(1);
                authToken = loginRes.json('token');
                const cookies = getCookies(loginRes);
                sessionCookie = cookies['connect.sid'];
            } else {
                errorRate.add(1);
                return; // Skip rest of test if login failed
            }
        });
    });
    
    sleep(2);
    
    // Authenticated requests
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Cookie': sessionCookie ? `connect.sid=${sessionCookie}` : '',
    };
    
    group('User Operations', () => {
        // Get user profile
        group('Get Profile', () => {
            const profileRes = http.get(
                `${BASE_URL}/api/users/profile`,
                { headers: authHeaders }
            );
            
            check(profileRes, {
                'Profile status 200': (r) => r.status === 200,
                'Profile has user data': (r) => r.json('username') === user.username,
            });
        });
        
        sleep(1);
        
        // Update profile
        group('Update Profile', () => {
            const updatePayload = JSON.stringify({
                bio: `Test bio for ${user.username}`,
                status: 'online',
            });
            
            const updateRes = http.put(
                `${BASE_URL}/api/users/profile`,
                updatePayload,
                { headers: authHeaders }
            );
            
            check(updateRes, {
                'Update profile status 200': (r) => r.status === 200,
            });
        });
        
        // Search users
        group('Search Users', () => {
            const searchRes = http.get(
                `${BASE_URL}/api/users/search?q=test`,
                { headers: authHeaders }
            );
            
            check(searchRes, {
                'Search status 200': (r) => r.status === 200,
                'Search returns array': (r) => Array.isArray(r.json()),
            });
        });
    });
    
    sleep(2);
    
    group('Messaging Operations', () => {
        // Get messages
        group('Get Messages', () => {
            const messagesRes = http.get(
                `${BASE_URL}/api/messages?limit=50`,
                { headers: authHeaders }
            );
            
            check(messagesRes, {
                'Get messages status 200': (r) => r.status === 200,
                'Messages is array': (r) => Array.isArray(r.json('messages')),
            });
        });
        
        sleep(1);
        
        // Send message
        group('Send Message', () => {
            const message = randomItem(testMessages);
            const messagePayload = JSON.stringify({
                content: message,
                type: 'text',
                roomId: 'general',
            });
            
            const sendRes = http.post(
                `${BASE_URL}/api/messages`,
                messagePayload,
                { headers: authHeaders, tags: { name: 'SendMessage' } }
            );
            
            messageDuration.add(sendRes.timings.duration);
            
            const sendSuccess = check(sendRes, {
                'Send message status 201': (r) => r.status === 201,
                'Message has ID': (r) => r.json('id') !== null,
                'Message content matches': (r) => r.json('content') === message,
            });
            
            if (!sendSuccess) {
                errorRate.add(1);
            }
        });
    });
    
    sleep(3);
    
    group('Room Operations', () => {
        // Get rooms
        group('Get Rooms', () => {
            const roomsRes = http.get(
                `${BASE_URL}/api/rooms`,
                { headers: authHeaders }
            );
            
            check(roomsRes, {
                'Get rooms status 200': (r) => r.status === 200,
                'Rooms is array': (r) => Array.isArray(r.json()),
            });
        });
        
        // Create room
        group('Create Room', () => {
            const roomPayload = JSON.stringify({
                name: `Test Room ${randomString(6)}`,
                description: 'Load test room',
                isPrivate: Math.random() > 0.5,
            });
            
            const createRoomRes = http.post(
                `${BASE_URL}/api/rooms`,
                roomPayload,
                { headers: authHeaders }
            );
            
            check(createRoomRes, {
                'Create room status 201': (r) => r.status === 201,
                'Room has ID': (r) => r.json('id') !== null,
            });
        });
    });
    
    sleep(2);
    
    // Logout
    group('Logout', () => {
        const logoutRes = http.post(
            `${BASE_URL}/api/auth/logout`,
            null,
            { headers: authHeaders }
        );
        
        check(logoutRes, {
            'Logout status 200': (r) => r.status === 200,
        });
        
        activeUsers.add(-1);
    });
    
    sleep(randomIntBetween(1, 5));
}

// Teardown
export function teardown(data) {
    const duration = (Date.now() - data.startTime) / 1000;
    console.log(`✅ Test completed in ${duration} seconds`);
    console.log(`📊 Summary:`);
    console.log(`   - Successful logins: ${successfulLogins.value}`);
    console.log(`   - Error rate: ${errorRate.value * 100}%`);
}

// Helper function
function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}