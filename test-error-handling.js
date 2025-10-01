/**
 * Test script for backend error handling improvements
 * Tests database connection, circuit breaker, and monitoring endpoints
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  host: process.env.TEST_HOST || 'localhost',
  port: process.env.TEST_PORT || 3000,
  protocol: process.env.TEST_PROTOCOL || 'http'
};

const baseUrl = `${config.protocol}://${config.host}:${config.port}`;

// Test utilities
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Error-Handling-Test/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const client = config.protocol === 'https' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const colors = {
    success: '\x1b[32m✅',
    error: '\x1b[31m❌',
    warning: '\x1b[33m⚠️',
    info: '\x1b[36mℹ️'
  };
  
  console.log(`${colors[level] || ''}  [${timestamp}] ${message}\x1b[0m`);
  if (data) {
    console.log('   ', JSON.stringify(data, null, 2));
  }
}

// Test functions
async function testHealthEndpoint() {
  log('info', 'Testing health endpoint...');
  
  try {
    const response = await makeRequest('/api/monitoring/health');
    
    if (response.statusCode === 200) {
      log('success', 'Health endpoint working correctly');
      log('info', 'Health status:', {
        status: response.body.status,
        database: response.body.database,
        memory: response.body.memory
      });
      return true;
    } else {
      log('error', `Health endpoint returned ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'Health endpoint test failed', error.message);
    return false;
  }
}

async function testErrorLogsEndpoint() {
  log('info', 'Testing error logs endpoint...');
  
  try {
    const response = await makeRequest('/api/monitoring/errors?limit=5');
    
    if (response.statusCode === 200) {
      log('success', 'Error logs endpoint working correctly');
      log('info', 'Error stats:', response.body.stats);
      return true;
    } else {
      log('error', `Error logs endpoint returned ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'Error logs endpoint test failed', error.message);
    return false;
  }
}

async function testSystemStatsEndpoint() {
  log('info', 'Testing system stats endpoint...');
  
  try {
    const response = await makeRequest('/api/monitoring/stats');
    
    if (response.statusCode === 200) {
      log('success', 'System stats endpoint working correctly');
      log('info', 'System info:', {
        uptime: response.body.uptime,
        database: response.body.database?.status,
        memory: response.body.memory,
        errors: response.body.errors
      });
      return true;
    } else {
      log('error', `System stats endpoint returned ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'System stats endpoint test failed', error.message);
    return false;
  }
}

async function testDatabaseEndpoint() {
  log('info', 'Testing database monitoring endpoint...');
  
  try {
    const response = await makeRequest('/api/monitoring/database');
    
    if (response.statusCode === 200) {
      log('success', 'Database monitoring endpoint working correctly');
      log('info', 'Database status:', {
        connected: response.body.status?.connected,
        healthy: response.body.healthy,
        circuitBreaker: response.body.circuitBreaker?.state
      });
      return true;
    } else {
      log('error', `Database endpoint returned ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'Database endpoint test failed', error.message);
    return false;
  }
}

async function testErrorHandling() {
  log('info', 'Testing error handling with invalid endpoint...');
  
  try {
    const response = await makeRequest('/api/nonexistent-endpoint');
    
    if (response.statusCode === 404) {
      log('success', 'Error handling working correctly for 404');
      if (response.body.error && response.body.timestamp) {
        log('success', 'Error response format is correct');
        return true;
      } else {
        log('warning', 'Error response format could be improved', response.body);
        return true;
      }
    } else {
      log('warning', `Expected 404, got ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'Error handling test failed', error.message);
    return false;
  }
}

async function testCircuitBreakerReset() {
  log('info', 'Testing circuit breaker reset endpoint...');
  
  try {
    const response = await makeRequest('/api/monitoring/circuit-breaker/reset', 'POST');
    
    if (response.statusCode === 200) {
      log('success', 'Circuit breaker reset endpoint working correctly');
      log('info', 'Reset result:', {
        before: response.body.before?.state,
        after: response.body.after?.state
      });
      return true;
    } else {
      log('error', `Circuit breaker reset returned ${response.statusCode}`, response.body);
      return false;
    }
  } catch (error) {
    log('error', 'Circuit breaker reset test failed', error.message);
    return false;
  }
}

async function performLoadTest() {
  log('info', 'Performing basic load test...');
  
  const requests = [];
  const startTime = Date.now();
  
  // Make 10 concurrent requests to health endpoint
  for (let i = 0; i < 10; i++) {
    requests.push(makeRequest('/api/monitoring/health'));
  }
  
  try {
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const failureCount = responses.length - successCount;
    
    log('info', `Load test completed in ${duration}ms`);
    log('info', `Successful requests: ${successCount}/${responses.length}`);
    
    if (failureCount > 0) {
      log('warning', `Failed requests: ${failureCount}`);
    }
    
    if (successCount >= 8) { // Allow for some failures
      log('success', 'Load test passed');
      return true;
    } else {
      log('error', 'Load test failed - too many failures');
      return false;
    }
  } catch (error) {
    log('error', 'Load test failed', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Backend Error Handling Test Suite');
  console.log('=====================================');
  console.log(`Testing against: ${baseUrl}\n`);
  
  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'Error Logs Endpoint', fn: testErrorLogsEndpoint },
    { name: 'System Stats Endpoint', fn: testSystemStatsEndpoint },
    { name: 'Database Monitoring', fn: testDatabaseEndpoint },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Circuit Breaker Reset', fn: testCircuitBreakerReset },
    { name: 'Basic Load Test', fn: performLoadTest }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log('error', `Test "${test.name}" threw an exception`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results');
  console.log('===============');
  log('success', `Passed: ${passed}`);
  if (failed > 0) {
    log('error', `Failed: ${failed}`);
  }
  log('info', `Total: ${passed + failed}`);
  
  const successRate = (passed / (passed + failed) * 100).toFixed(1);
  console.log(`\n🎯 Success Rate: ${successRate}%`);
  
  if (failed === 0) {
    log('success', 'All tests passed! 🎉');
    process.exit(0);
  } else {
    log('warning', 'Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Backend Error Handling Test Suite

Usage: node test-error-handling.js [options]

Options:
  --help, -h          Show this help message
  --host <host>       Test host (default: localhost)
  --port <port>       Test port (default: 3000)
  --protocol <proto>  Protocol http/https (default: http)

Environment Variables:
  TEST_HOST           Test host
  TEST_PORT           Test port  
  TEST_PROTOCOL       Test protocol

Examples:
  node test-error-handling.js
  node test-error-handling.js --host example.com --port 443 --protocol https
  TEST_HOST=production.com TEST_PORT=443 TEST_PROTOCOL=https node test-error-handling.js
`);
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--host':
      config.host = args[++i];
      break;
    case '--port':
      config.port = args[++i];
      break;
    case '--protocol':
      config.protocol = args[++i];
      break;
  }
}

// Run the tests
runTests().catch(error => {
  log('error', 'Test suite failed', error.message);
  process.exit(1);
});