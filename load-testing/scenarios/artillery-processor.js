/**
 * Artillery Processor for Socket.IO Testing
 * Provides custom functions and hooks for Artillery scenarios
 */

const axios = require('axios');

module.exports = {
    // Before scenario starts
    beforeScenario: beforeScenario,
    // After scenario ends
    afterScenario: afterScenario,
    // Custom functions
    generateUserId: generateUserId,
    generateMessage: generateMessage,
    validateResponse: validateResponse,
    logMetrics: logMetrics,
};

// Metrics storage
let metrics = {
    messagesSucceeded: 0,
    messagesFailed: 0,
    connectionsSucceeded: 0,
    connectionsFailed: 0,
    totalLatency: 0,
    messageCount: 0,
};

/**
 * Called before each scenario starts
 */
async function beforeScenario(requestParams, context, ee, next) {
    try {
        // Set custom headers
        requestParams.headers = requestParams.headers || {};
        requestParams.headers['X-Test-ID'] = generateTestId();
        requestParams.headers['X-Test-Timestamp'] = Date.now();

        // Initialize user context
        context.vars.userId = generateUserId();
        context.vars.sessionId = generateSessionId();
        context.vars.startTime = Date.now();

        // Acquire auth token via guest registration
        const baseURL = process.env.BASE_URL || process.env.ARTILLERY_TARGET || 'http://localhost:3000';
        const username = `lt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const res = await axios.post(`${baseURL}/api/auth/guest`, {
            username,
            gender: 'male',
        }, { validateStatus: () => true });

        let token = null;
        try {
            const setCookie = res.headers['set-cookie'] || [];
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
            for (const c of cookies) {
                const m = /auth_token=([^;]+)/.exec(c || '');
                if (m) { token = decodeURIComponent(m[1]); break; }
            }
        } catch {}

        if (token) {
            context.vars.token = token;
            requestParams.headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('⚠️ Unable to extract auth_token cookie for Artillery user. Socket auth may fail.');
        }

        // Log scenario start
        console.log(`🚀 Starting scenario for user: ${context.vars.userId}`);
        return next();
    } catch (e) {
        console.error('❌ beforeScenario error:', e.message || e);
        return next();
    }
}

/**
 * Called after each scenario ends
 */
function afterScenario(requestParams, response, context, ee, next) {
    const duration = Date.now() - context.vars.startTime;
    
    // Log scenario completion
    console.log(`✅ Scenario completed for user: ${context.vars.userId} in ${duration}ms`);
    
    // Update metrics
    if (response && response.statusCode === 200) {
        metrics.connectionsSucceeded++;
    } else {
        metrics.connectionsFailed++;
    }
    
    // Emit custom metrics
    ee.emit('customStat', {
        stat: 'scenario.duration',
        value: duration,
    });
    
    return next();
}

/**
 * Generate unique user ID
 */
function generateUserId(context, events, done) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    context.vars.userId = userId;
    return done();
}

/**
 * Generate test message with metadata
 */
function generateMessage(context, events, done) {
    const messages = [
        'مرحبا، هذه رسالة اختبار الأداء',
        'Performance testing in progress',
        'اختبار Socket.IO مع Artillery',
        'Real-time messaging load test',
        `Message from ${context.vars.userId}`,
        `Timestamp: ${Date.now()}`,
        'Testing Arabic support: السلام عليكم',
        'Testing emojis: 🚀 💯 🔥',
    ];
    
    const message = {
        id: generateMessageId(),
        content: messages[Math.floor(Math.random() * messages.length)],
        userId: context.vars.userId,
        timestamp: Date.now(),
        metadata: {
            testId: context.vars.testId,
            scenarioId: context.vars.scenarioId,
        },
    };
    
    context.vars.message = message;
    
    // Track message
    metrics.messageCount++;
    
    return done();
}

/**
 * Validate WebSocket response
 */
function validateResponse(requestParams, response, context, ee, next) {
    // Check response structure
    if (!response) {
        metrics.messagesFailed++;
        console.error('❌ No response received');
        return next(new Error('No response'));
    }
    
    // Validate Socket.IO specific response
    if (response.type === 'message' || response.type === 'event') {
        metrics.messagesSucceeded++;
        
        // Calculate latency if timestamp is available
        if (response.timestamp && context.vars.messageSentTime) {
            const latency = Date.now() - context.vars.messageSentTime;
            metrics.totalLatency += latency;
            
            // Emit latency metric
            ee.emit('customStat', {
                stat: 'message.latency',
                value: latency,
            });
            
            // Log high latency
            if (latency > 1000) {
                console.warn(`⚠️ High latency detected: ${latency}ms for user ${context.vars.userId}`);
            }
        }
    } else if (response.type === 'error') {
        metrics.messagesFailed++;
        console.error(`❌ Error response: ${response.message}`);
        return next(new Error(response.message));
    }
    
    return next();
}

/**
 * Log current metrics
 */
function logMetrics(context, events, done) {
    const avgLatency = metrics.messageCount > 0 
        ? (metrics.totalLatency / metrics.messageCount).toFixed(2) 
        : 0;
    
    console.log('\n📊 Current Metrics:');
    console.log(`   Messages Sent: ${metrics.messageCount}`);
    console.log(`   Messages Succeeded: ${metrics.messagesSucceeded}`);
    console.log(`   Messages Failed: ${metrics.messagesFailed}`);
    console.log(`   Connections Succeeded: ${metrics.connectionsSucceeded}`);
    console.log(`   Connections Failed: ${metrics.connectionsFailed}`);
    console.log(`   Average Latency: ${avgLatency}ms`);
    console.log(`   Success Rate: ${((metrics.messagesSucceeded / Math.max(metrics.messageCount, 1)) * 100).toFixed(2)}%\n`);
    
    return done();
}

// Helper functions
function generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export metrics for external access
module.exports.getMetrics = function() {
    return metrics;
};

// Reset metrics
module.exports.resetMetrics = function() {
    metrics = {
        messagesSucceeded: 0,
        messagesFailed: 0,
        connectionsSucceeded: 0,
        connectionsFailed: 0,
        totalLatency: 0,
        messageCount: 0,
    };
};