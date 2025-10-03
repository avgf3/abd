#!/usr/bin/env node

/**
 * Master Load Testing Orchestrator
 * Runs all load testing scenarios and generates comprehensive reports
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Test environment
const ENV = process.env.TEST_ENV || 'local';
const environment = config.environments[ENV];

// Results storage
const results = {
    startTime: null,
    endTime: null,
    environment: ENV,
    tests: [],
    summary: {},
};

// ASCII Art Banner
function printBanner() {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🚀 COMPREHENSIVE LOAD TESTING SUITE 🚀                  ║
║                                                              ║
║     Chat Application Performance Testing                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `));
}

// Print test plan
function printTestPlan() {
    console.log(chalk.yellow('\n📋 Test Plan:\n'));
    
    const table = new Table({
        head: ['Test', 'Tool', 'Duration', 'Max Users'],
        colWidths: [30, 15, 15, 15],
        style: { head: ['cyan'] }
    });
    
    table.push(
        ['HTTP Ramp-up Test', 'K6', '35 min', '1000'],
        ['WebSocket Connection Test', 'K6', '20 min', '1000'],
        ['Socket.IO Load Test', 'Artillery', '20 min', '200'],
        ['HTTP Stress Test', 'Autocannon', '2 min', '1000'],
        ['Endurance Test', 'K6', '30 min', '200']
    );
    
    console.log(table.toString());
}

// Check prerequisites
async function checkPrerequisites() {
    const spinner = ora('Checking prerequisites...').start();
    
    const tools = ['k6', 'artillery', 'autocannon'];
    const missing = [];
    
    for (const tool of tools) {
        const exists = await checkToolExists(tool);
        if (!exists) {
            missing.push(tool);
        }
    }
    
    if (missing.length > 0) {
        spinner.fail(`Missing tools: ${missing.join(', ')}`);
        console.log(chalk.yellow('\nPlease run: ./scripts/install-tools.sh'));
        process.exit(1);
    }
    
    // Check if server is running
    const serverRunning = await checkServerHealth();
    if (!serverRunning) {
        spinner.fail('Server is not running or not healthy');
        console.log(chalk.yellow('\nPlease start the server first: npm run dev'));
        process.exit(1);
    }
    
    spinner.succeed('All prerequisites met');
}

// Check if tool exists
function checkToolExists(tool) {
    return new Promise((resolve) => {
        exec(`which ${tool}`, (error) => {
            resolve(!error);
        });
    });
}

// Check server health
function checkServerHealth() {
    return new Promise((resolve) => {
        const http = require('http');
        const url = new URL(`${environment.baseURL}/api/health`);
        
        const req = http.get(url, (res) => {
            resolve(res.statusCode === 200);
        });
        
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Run K6 HTTP test
async function runK6HttpTest() {
    const spinner = ora('Running K6 HTTP Load Test...').start();
    
    return new Promise((resolve) => {
        const testFile = path.join(__dirname, '..', 'scenarios', 'k6-http-test.js');
        const outputFile = path.join(__dirname, '..', 'results', `k6-http-${Date.now()}.json`);
        
        const k6Process = spawn('k6', [
            'run',
            '--out', `json=${outputFile}`,
            '--summary-export', outputFile.replace('.json', '-summary.json'),
            '-e', `BASE_URL=${environment.baseURL}`,
            '-e', 'SCENARIO=rampUp',
            testFile
        ]);
        
        let output = '';
        
        k6Process.stdout.on('data', (data) => {
            output += data.toString();
            // Update spinner with current VUs
            const vuMatch = data.toString().match(/vus=(\d+)/);
            if (vuMatch) {
                spinner.text = `Running K6 HTTP Test... (${vuMatch[1]} VUs)`;
            }
        });
        
        k6Process.stderr.on('data', (data) => {
            console.error(chalk.red(data.toString()));
        });
        
        k6Process.on('close', (code) => {
            if (code === 0) {
                spinner.succeed('K6 HTTP Test completed');
                
                // Parse summary
                const summaryFile = outputFile.replace('.json', '-summary.json');
                if (fs.existsSync(summaryFile)) {
                    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
                    results.tests.push({
                        name: 'K6 HTTP Test',
                        tool: 'K6',
                        status: 'completed',
                        summary: extractK6Summary(summary),
                        outputFile: outputFile,
                    });
                }
            } else {
                spinner.fail('K6 HTTP Test failed');
            }
            resolve();
        });
    });
}

// Run K6 WebSocket test
async function runK6WebSocketTest() {
    const spinner = ora('Running K6 WebSocket Test...').start();
    
    return new Promise((resolve) => {
        const testFile = path.join(__dirname, '..', 'scenarios', 'k6-websocket-test.js');
        const outputFile = path.join(__dirname, '..', 'results', `k6-websocket-${Date.now()}.json`);
        
        const k6Process = spawn('k6', [
            'run',
            '--out', `json=${outputFile}`,
            '--summary-export', outputFile.replace('.json', '-summary.json'),
            '-e', `WS_URL=${environment.wsURL}`,
            '-e', 'SCENARIO=wsConnection',
            testFile
        ]);
        
        k6Process.stdout.on('data', (data) => {
            const vuMatch = data.toString().match(/vus=(\d+)/);
            if (vuMatch) {
                spinner.text = `Running K6 WebSocket Test... (${vuMatch[1]} connections)`;
            }
        });
        
        k6Process.on('close', (code) => {
            if (code === 0) {
                spinner.succeed('K6 WebSocket Test completed');
                
                const summaryFile = outputFile.replace('.json', '-summary.json');
                if (fs.existsSync(summaryFile)) {
                    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
                    results.tests.push({
                        name: 'K6 WebSocket Test',
                        tool: 'K6',
                        status: 'completed',
                        summary: extractK6Summary(summary),
                        outputFile: outputFile,
                    });
                }
            } else {
                spinner.fail('K6 WebSocket Test failed');
            }
            resolve();
        });
    });
}

// Run Artillery Socket.IO test
async function runArtilleryTest() {
    const spinner = ora('Running Artillery Socket.IO Test...').start();
    
    return new Promise((resolve) => {
        const configFile = path.join(__dirname, '..', 'scenarios', 'artillery-socketio.yml');
        const outputFile = path.join(__dirname, '..', 'results', `artillery-${Date.now()}.json`);
        
        const artilleryProcess = spawn('artillery', [
            'run',
            '--output', outputFile,
            '--target', environment.baseURL,
            configFile
        ]);
        
        artilleryProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Phase')) {
                const phaseMatch = output.match(/Phase: (.+)/);
                if (phaseMatch) {
                    spinner.text = `Running Artillery Test... (${phaseMatch[1]})`;
                }
            }
        });
        
        artilleryProcess.on('close', (code) => {
            if (code === 0) {
                spinner.succeed('Artillery Socket.IO Test completed');
                
                if (fs.existsSync(outputFile)) {
                    const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
                    results.tests.push({
                        name: 'Artillery Socket.IO Test',
                        tool: 'Artillery',
                        status: 'completed',
                        summary: extractArtillerySummary(report),
                        outputFile: outputFile,
                    });
                }
            } else {
                spinner.fail('Artillery Test failed');
            }
            resolve();
        });
    });
}

// Run Autocannon test
async function runAutocannonTest() {
    const spinner = ora('Running Autocannon HTTP Stress Test...').start();
    
    return new Promise((resolve) => {
        const scriptFile = path.join(__dirname, '..', 'scenarios', 'autocannon-http.js');
        
        const autocannonProcess = spawn('node', [
            scriptFile,
            'spike'
        ], {
            env: {
                ...process.env,
                BASE_URL: environment.baseURL,
                DURATION: '30',
                CONNECTIONS: '500',
            }
        });
        
        autocannonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Running')) {
                spinner.text = 'Running Autocannon Stress Test...';
            }
        });
        
        autocannonProcess.on('close', (code) => {
            if (code === 0) {
                spinner.succeed('Autocannon Test completed');
                
                // Find the latest results file
                const resultsDir = path.join(__dirname, '..', 'results');
                const files = fs.readdirSync(resultsDir)
                    .filter(f => f.startsWith('autocannon-results-'))
                    .sort((a, b) => b.localeCompare(a));
                
                if (files.length > 0) {
                    const latestFile = path.join(resultsDir, files[0]);
                    const report = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
                    results.tests.push({
                        name: 'Autocannon HTTP Stress Test',
                        tool: 'Autocannon',
                        status: 'completed',
                        summary: extractAutocannonSummary(report),
                        outputFile: latestFile,
                    });
                }
            } else {
                spinner.fail('Autocannon Test failed');
            }
            resolve();
        });
    });
}

// Extract K6 summary
function extractK6Summary(summary) {
    return {
        requests: summary.metrics?.http_reqs?.values?.count || 0,
        errors: summary.metrics?.http_req_failed?.values?.passes || 0,
        duration: summary.state?.testRunDurationMs || 0,
        vus: summary.metrics?.vus?.values?.value || 0,
        latency: {
            p50: summary.metrics?.http_req_duration?.values?.['p(50)'] || 0,
            p95: summary.metrics?.http_req_duration?.values?.['p(95)'] || 0,
            p99: summary.metrics?.http_req_duration?.values?.['p(99)'] || 0,
        },
    };
}

// Extract Artillery summary
function extractArtillerySummary(report) {
    const aggregate = report.aggregate || {};
    return {
        requests: aggregate.counters?.['http.requests'] || 0,
        errors: aggregate.counters?.['errors'] || 0,
        duration: aggregate.firstMetricAt && aggregate.lastMetricAt 
            ? (new Date(aggregate.lastMetricAt) - new Date(aggregate.firstMetricAt)) / 1000 
            : 0,
        latency: {
            p50: aggregate.summaries?.['http.response_time']?.p50 || 0,
            p95: aggregate.summaries?.['http.response_time']?.p95 || 0,
            p99: aggregate.summaries?.['http.response_time']?.p99 || 0,
        },
    };
}

// Extract Autocannon summary
function extractAutocannonSummary(report) {
    return {
        requests: report.requests?.total || 0,
        errors: report.errors || 0,
        duration: report.duration || 0,
        throughput: report.throughput?.average || 0,
        latency: {
            p50: report.latency?.p50 || 0,
            p95: report.latency?.p95 || 0,
            p99: report.latency?.p99 || 0,
        },
    };
}

// Generate final report
function generateFinalReport() {
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('📊 FINAL TEST REPORT'));
    console.log(chalk.cyan('='.repeat(60)));
    
    // Test summary table
    const table = new Table({
        head: ['Test', 'Status', 'Requests', 'Errors', 'P95 Latency'],
        colWidths: [30, 12, 12, 12, 15],
        style: { head: ['cyan'] }
    });
    
    for (const test of results.tests) {
        const errorRate = test.summary.requests > 0 
            ? ((test.summary.errors / test.summary.requests) * 100).toFixed(2) 
            : '0.00';
        
        table.push([
            test.name,
            test.status === 'completed' ? chalk.green('✅ Pass') : chalk.red('❌ Fail'),
            test.summary.requests.toLocaleString(),
            `${test.summary.errors} (${errorRate}%)`,
            `${test.summary.latency?.p95?.toFixed(0) || 'N/A'} ms`
        ]);
    }
    
    console.log(table.toString());
    
    // Overall statistics
    const totalRequests = results.tests.reduce((sum, t) => sum + (t.summary.requests || 0), 0);
    const totalErrors = results.tests.reduce((sum, t) => sum + (t.summary.errors || 0), 0);
    const avgP95 = results.tests.reduce((sum, t) => sum + (t.summary.latency?.p95 || 0), 0) / results.tests.length;
    
    console.log(chalk.yellow('\n📈 Overall Statistics:'));
    console.log(chalk.white(`   Total Requests: ${totalRequests.toLocaleString()}`));
    console.log(chalk.white(`   Total Errors: ${totalErrors.toLocaleString()}`));
    console.log(chalk.white(`   Error Rate: ${((totalErrors / totalRequests) * 100).toFixed(3)}%`));
    console.log(chalk.white(`   Average P95 Latency: ${avgP95.toFixed(0)}ms`));
    console.log(chalk.white(`   Test Duration: ${((results.endTime - results.startTime) / 1000 / 60).toFixed(1)} minutes`));
    
    // Save final report
    const reportFile = path.join(__dirname, '..', 'results', `final-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(chalk.green(`\n💾 Full report saved to: ${path.basename(reportFile)}`));
    
    // Check if tests passed
    const passed = totalErrors / totalRequests < 0.01 && avgP95 < 1000;
    if (passed) {
        console.log(chalk.green('\n🎉 All tests passed successfully!'));
    } else {
        console.log(chalk.red('\n⚠️  Some tests did not meet the performance criteria'));
    }
}

// Main execution
async function main() {
    printBanner();
    printTestPlan();
    
    console.log(chalk.yellow('\n🔍 Environment: ') + chalk.white(ENV));
    console.log(chalk.yellow('📍 Target URL: ') + chalk.white(environment.baseURL));
    
    // Check prerequisites
    await checkPrerequisites();
    
    // Ensure results directory exists
    const resultsDir = path.join(__dirname, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    results.startTime = Date.now();
    
    console.log(chalk.cyan('\n🚀 Starting Load Tests...\n'));
    
    try {
        // Run tests sequentially to avoid overloading the server
        await runK6HttpTest();
        await sleep(5000); // Wait between tests
        
        await runK6WebSocketTest();
        await sleep(5000);
        
        await runArtilleryTest();
        await sleep(5000);
        
        await runAutocannonTest();
        
    } catch (error) {
        console.error(chalk.red('❌ Error during testing:'), error);
    }
    
    results.endTime = Date.now();
    
    // Generate final report
    generateFinalReport();
}

// Helper function to sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle interruption
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⚠️  Tests interrupted by user'));
    results.endTime = Date.now();
    generateFinalReport();
    process.exit(0);
});

// Run if executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };