#!/usr/bin/env node

/**
 * Autocannon HTTP Load Testing Script
 * Fast HTTP benchmarking for the chat application
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');
let chalk = require('chalk');
// Support chalk v5 ESM default export shape when required via CJS
chalk = chalk && chalk.default ? chalk.default : chalk;

// Configuration
const config = {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    duration: parseInt(process.env.DURATION) || 60, // seconds
    connections: parseInt(process.env.CONNECTIONS) || 100,
    pipelining: parseInt(process.env.PIPELINING) || 10,
    bailout: parseInt(process.env.BAILOUT) || 1000, // Stop if error rate too high
    timeout: parseInt(process.env.TIMEOUT) || 10, // seconds
};

// Test scenarios
const scenarios = {
    // Basic health check
    healthCheck: {
        title: 'Health Check Endpoint',
        url: `${config.baseURL}/api/health`,
        method: 'GET',
        connections: 10,
        duration: 30,
    },
    
    // Authentication endpoints
    authFlow: {
        title: 'Authentication Flow',
        url: `${config.baseURL}/api/auth/login`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'testuser',
            password: 'Test@123456',
        }),
        connections: 50,
        duration: 60,
    },
    
    // API endpoints stress test
    apiStress: {
        title: 'API Endpoints Stress Test',
        url: `${config.baseURL}/api`,
        connections: config.connections,
        duration: config.duration,
        pipelining: config.pipelining,
        requests: [
            {
                method: 'GET',
                path: '/api/health',
            },
            {
                method: 'GET',
                path: '/api/users/profile',
                headers: {
                    'Authorization': 'Bearer test_token',
                },
            },
            {
                method: 'GET',
                path: '/api/messages?limit=50',
                headers: {
                    'Authorization': 'Bearer test_token',
                },
            },
            {
                method: 'GET',
                path: '/api/rooms',
                headers: {
                    'Authorization': 'Bearer test_token',
                },
            },
        ],
    },
    
    // Static files test
    staticFiles: {
        title: 'Static Files Performance',
        url: `${config.baseURL}`,
        connections: 200,
        duration: 30,
        requests: [
            {
                method: 'GET',
                path: '/',
            },
            {
                method: 'GET',
                path: '/assets/logo.png',
            },
            {
                method: 'GET',
                path: '/css/style.css',
            },
            {
                method: 'GET',
                path: '/js/app.js',
            },
        ],
    },
    
    // Message sending load test
    messageSending: {
        title: 'Message Sending Load Test',
        url: `${config.baseURL}/api/messages`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token',
        },
        body: JSON.stringify({
            content: 'Autocannon test message',
            roomId: 'general',
            type: 'text',
        }),
        connections: 100,
        duration: 120,
        pipelining: 5,
    },
    
    // Spike test
    spike: {
        title: 'Spike Test',
        url: `${config.baseURL}/api/health`,
        method: 'GET',
        connections: 1000,
        duration: 30,
        pipelining: 1,
        bailout: 5000,
    },
};

// Custom request generator for dynamic data
function setupRequest(client) {
    const messages = [
        'Test message from Autocannon',
        'مرحبا من اختبار الأداء',
        'Performance testing in progress',
        'Load test message',
        '🚀 Stress testing the API',
    ];
    
    const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
    
    client.on('response', (statusCode, resBytes, responseTime) => {
        if (statusCode >= 400) {
            console.log(chalk.red(`Error ${statusCode}: ${responseTime}ms`));
        }
    });
    
    // Return request generator function
    return function (client) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Customize request based on endpoint
        if (client.opts.path && client.opts.path.includes('/messages')) {
            client.setBody(JSON.stringify({
                content: randomMessage,
                userId: randomUser,
                timestamp: Date.now(),
            }));
        }
    };
}

// Run specific scenario
async function runScenario(scenarioName) {
    const scenario = scenarios[scenarioName];
    
    if (!scenario) {
        console.error(chalk.red(`❌ Scenario '${scenarioName}' not found`));
        console.log(chalk.yellow('Available scenarios:'), Object.keys(scenarios).join(', '));
        process.exit(1);
    }
    
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan(`🚀 Running: ${scenario.title}`));
    console.log(chalk.cyan('='.repeat(60)));
    
    const instance = autocannon({
        ...scenario,
        setupClient: setupRequest,
    }, handleResults);
    
    // Handle Ctrl+C
    process.once('SIGINT', () => {
        instance.stop();
    });
    
    // Track progress
    autocannon.track(instance, {
        renderProgressBar: true,
        renderResultsTable: true,
        renderLatencyTable: true,
    });
}

// Handle test results
function handleResults(err, result) {
    if (err) {
        console.error(chalk.red('❌ Test failed:'), err);
        process.exit(1);
    }
    
    console.log(chalk.green('\n✅ Test completed successfully!\n'));
    
    // Display summary
    console.log(chalk.cyan('📊 Summary:'));
    console.log(chalk.white(`   Duration: ${result.duration}s`));
    console.log(chalk.white(`   Connections: ${result.connections}`));
    console.log(chalk.white(`   Pipelining: ${result.pipelining}`));
    console.log(chalk.white(`   Total Requests: ${result.requests.total}`));
    console.log(chalk.white(`   Requests/sec: ${result.requests.average}`));
    console.log(chalk.white(`   Bytes/sec: ${result.throughput.average}`));
    
    // Display latency
    console.log(chalk.cyan('\n⏱️  Latency:'));
    console.log(chalk.white(`   Mean: ${result.latency.mean}ms`));
    console.log(chalk.white(`   Std Dev: ${result.latency.stddev}ms`));
    console.log(chalk.white(`   Min: ${result.latency.min}ms`));
    console.log(chalk.white(`   Max: ${result.latency.max}ms`));
    console.log(chalk.white(`   P50: ${result.latency.p50}ms`));
    console.log(chalk.white(`   P90: ${result.latency.p90}ms`));
    console.log(chalk.white(`   P95: ${result.latency.p95}ms`));
    console.log(chalk.white(`   P99: ${result.latency.p99}ms`));
    
    // Display errors if any
    if (result.errors > 0) {
        console.log(chalk.red(`\n⚠️  Errors: ${result.errors}`));
        console.log(chalk.red(`   Error Rate: ${((result.errors / result.requests.total) * 100).toFixed(2)}%`));
    }
    
    // Display timeouts if any
    if (result.timeouts > 0) {
        console.log(chalk.yellow(`\n⏱️  Timeouts: ${result.timeouts}`));
    }
    
    // Save results to file
    saveResults(result);
    
    // Check thresholds
    checkThresholds(result);
}

// Save results to JSON file
function saveResults(result) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `autocannon-results-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'results', filename);
    
    // Ensure results directory exists
    const resultsDir = path.dirname(filepath);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save results
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(chalk.green(`\n💾 Results saved to: ${filename}`));
}

// Check performance thresholds
function checkThresholds(result) {
    console.log(chalk.cyan('\n🎯 Threshold Checks:'));
    
    const thresholds = {
        'P95 Latency < 500ms': result.latency.p95 < 500,
        'P99 Latency < 1000ms': result.latency.p99 < 1000,
        'Error Rate < 1%': (result.errors / result.requests.total) < 0.01,
        'Requests/sec > 100': result.requests.average > 100,
    };
    
    let passed = true;
    for (const [check, pass] of Object.entries(thresholds)) {
        if (pass) {
            console.log(chalk.green(`   ✅ ${check}`));
        } else {
            console.log(chalk.red(`   ❌ ${check}`));
            passed = false;
        }
    }
    
    if (!passed) {
        console.log(chalk.yellow('\n⚠️  Some thresholds were not met'));
        process.exit(1);
    } else {
        console.log(chalk.green('\n🎉 All thresholds passed!'));
    }
}

// Run all scenarios
async function runAllScenarios() {
    console.log(chalk.cyan('🔄 Running all scenarios...\n'));
    
    for (const [name, scenario] of Object.entries(scenarios)) {
        await new Promise((resolve) => {
            const instance = autocannon({
                ...scenario,
                setupClient: setupRequest,
            }, (err, result) => {
                if (err) {
                    console.error(chalk.red(`❌ ${scenario.title} failed:`), err);
                } else {
                    console.log(chalk.green(`✅ ${scenario.title} completed`));
                    saveResults(result);
                }
                resolve();
            });
            
            autocannon.track(instance, {
                renderProgressBar: true,
                renderResultsTable: false,
            });
        });
        
        // Wait between scenarios
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(chalk.green('\n🎉 All scenarios completed!'));
}

// Main execution
if (require.main === module) {
    const scenarioName = process.argv[2];
    
    if (scenarioName === 'all') {
        runAllScenarios();
    } else if (scenarioName) {
        runScenario(scenarioName);
    } else {
        console.log(chalk.cyan('Autocannon HTTP Load Testing'));
        console.log(chalk.cyan('============================\n'));
        console.log(chalk.white('Usage: node autocannon-http.js [scenario]\n'));
        console.log(chalk.white('Available scenarios:'));
        for (const [name, scenario] of Object.entries(scenarios)) {
            console.log(chalk.yellow(`  ${name}`) + chalk.gray(` - ${scenario.title}`));
        }
        console.log(chalk.yellow('  all') + chalk.gray(' - Run all scenarios'));
        console.log(chalk.white('\nExample: node autocannon-http.js healthCheck'));
    }
}

module.exports = { runScenario, runAllScenarios, scenarios };