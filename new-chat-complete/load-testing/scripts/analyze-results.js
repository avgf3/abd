#!/usr/bin/env node

/**
 * Load Test Results Analyzer and Report Generator
 * Analyzes test results and generates comprehensive reports
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');
const PDFDocument = require('pdfkit');

class ResultsAnalyzer {
    constructor() {
        this.resultsDir = path.join(__dirname, '..', 'results');
        this.results = [];
        this.analysis = {
            summary: {},
            trends: {},
            bottlenecks: [],
            recommendations: [],
        };
    }
    
    // Load all result files
    loadResults() {
        console.log(chalk.cyan('📂 Loading test results...'));
        
        const files = fs.readdirSync(this.resultsDir)
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => {
                const timeA = fs.statSync(path.join(this.resultsDir, a)).mtime;
                const timeB = fs.statSync(path.join(this.resultsDir, b)).mtime;
                return timeB - timeA;
            });
        
        for (const file of files) {
            try {
                const filepath = path.join(this.resultsDir, file);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                this.results.push({
                    filename: file,
                    timestamp: fs.statSync(filepath).mtime,
                    tool: this.detectTool(file),
                    data: data,
                });
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Could not parse ${file}: ${error.message}`));
            }
        }
        
        console.log(chalk.green(`✅ Loaded ${this.results.length} result files`));
    }
    
    // Detect which tool generated the results
    detectTool(filename) {
        if (filename.includes('k6')) return 'K6';
        if (filename.includes('artillery')) return 'Artillery';
        if (filename.includes('autocannon')) return 'Autocannon';
        return 'Unknown';
    }
    
    // Analyze K6 results
    analyzeK6Results(result) {
        const metrics = result.data.metrics || {};
        
        return {
            requests: {
                total: metrics.http_reqs?.values?.count || 0,
                rate: metrics.http_reqs?.values?.rate || 0,
            },
            errors: {
                total: metrics.http_req_failed?.values?.passes || 0,
                rate: metrics.http_req_failed?.values?.rate || 0,
            },
            latency: {
                min: metrics.http_req_duration?.values?.min || 0,
                max: metrics.http_req_duration?.values?.max || 0,
                avg: metrics.http_req_duration?.values?.avg || 0,
                med: metrics.http_req_duration?.values?.med || 0,
                p90: metrics.http_req_duration?.values?.['p(90)'] || 0,
                p95: metrics.http_req_duration?.values?.['p(95)'] || 0,
                p99: metrics.http_req_duration?.values?.['p(99)'] || 0,
            },
            vus: {
                max: metrics.vus_max?.values?.value || 0,
                min: metrics.vus?.values?.min || 0,
            },
            websocket: {
                connections: metrics.ws_connecting?.values?.count || 0,
                messages_sent: metrics.ws_msgs_sent?.values?.count || 0,
                messages_received: metrics.ws_msgs_received?.values?.count || 0,
            },
        };
    }
    
    // Analyze Artillery results
    analyzeArtilleryResults(result) {
        const aggregate = result.data.aggregate || {};
        
        return {
            requests: {
                total: aggregate.counters?.['http.requests'] || 0,
                rate: aggregate.rates?.['http.request_rate'] || 0,
            },
            errors: {
                total: aggregate.counters?.['errors'] || 0,
                timeout: aggregate.counters?.['errors.timeout'] || 0,
            },
            latency: {
                min: aggregate.summaries?.['http.response_time']?.min || 0,
                max: aggregate.summaries?.['http.response_time']?.max || 0,
                median: aggregate.summaries?.['http.response_time']?.median || 0,
                p95: aggregate.summaries?.['http.response_time']?.p95 || 0,
                p99: aggregate.summaries?.['http.response_time']?.p99 || 0,
            },
            scenarios: {
                created: aggregate.counters?.['vusers.created'] || 0,
                completed: aggregate.counters?.['vusers.completed'] || 0,
                failed: aggregate.counters?.['vusers.failed'] || 0,
            },
        };
    }
    
    // Analyze Autocannon results
    analyzeAutocannonResults(result) {
        return {
            requests: {
                total: result.data.requests?.total || 0,
                average: result.data.requests?.average || 0,
                sent: result.data.requests?.sent || 0,
            },
            errors: {
                total: result.data.errors || 0,
                timeouts: result.data.timeouts || 0,
            },
            latency: {
                min: result.data.latency?.min || 0,
                max: result.data.latency?.max || 0,
                mean: result.data.latency?.mean || 0,
                stddev: result.data.latency?.stddev || 0,
                p50: result.data.latency?.p50 || 0,
                p90: result.data.latency?.p90 || 0,
                p95: result.data.latency?.p95 || 0,
                p99: result.data.latency?.p99 || 0,
                p999: result.data.latency?.p999 || 0,
            },
            throughput: {
                average: result.data.throughput?.average || 0,
                mean: result.data.throughput?.mean || 0,
                stddev: result.data.throughput?.stddev || 0,
                min: result.data.throughput?.min || 0,
                max: result.data.throughput?.max || 0,
            },
        };
    }
    
    // Perform comprehensive analysis
    analyze() {
        console.log(chalk.cyan('\n🔍 Analyzing results...'));
        
        const analyses = [];
        
        for (const result of this.results) {
            let analysis;
            
            switch (result.tool) {
                case 'K6':
                    analysis = this.analyzeK6Results(result);
                    break;
                case 'Artillery':
                    analysis = this.analyzeArtilleryResults(result);
                    break;
                case 'Autocannon':
                    analysis = this.analyzeAutocannonResults(result);
                    break;
                default:
                    continue;
            }
            
            analyses.push({
                tool: result.tool,
                timestamp: result.timestamp,
                analysis: analysis,
            });
        }
        
        // Calculate overall statistics
        this.calculateOverallStats(analyses);
        
        // Identify bottlenecks
        this.identifyBottlenecks(analyses);
        
        // Generate recommendations
        this.generateRecommendations(analyses);
        
        console.log(chalk.green('✅ Analysis complete'));
    }
    
    // Calculate overall statistics
    calculateOverallStats(analyses) {
        if (analyses.length === 0) return;
        
        const totalRequests = analyses.reduce((sum, a) => sum + a.analysis.requests.total, 0);
        const totalErrors = analyses.reduce((sum, a) => sum + a.analysis.errors.total, 0);
        
        const latencies = analyses.map(a => a.analysis.latency);
        const avgP95 = latencies.reduce((sum, l) => sum + (l.p95 || 0), 0) / latencies.length;
        const avgP99 = latencies.reduce((sum, l) => sum + (l.p99 || 0), 0) / latencies.length;
        
        this.analysis.summary = {
            totalTests: analyses.length,
            totalRequests: totalRequests,
            totalErrors: totalErrors,
            errorRate: (totalErrors / totalRequests * 100).toFixed(2),
            averageP95Latency: avgP95.toFixed(0),
            averageP99Latency: avgP99.toFixed(0),
            tools: [...new Set(analyses.map(a => a.tool))],
        };
    }
    
    // Identify performance bottlenecks
    identifyBottlenecks(analyses) {
        this.analysis.bottlenecks = [];
        
        for (const analysis of analyses) {
            const a = analysis.analysis;
            
            // High latency
            if (a.latency.p95 > 1000) {
                this.analysis.bottlenecks.push({
                    type: 'High Latency',
                    severity: a.latency.p95 > 5000 ? 'Critical' : 'Warning',
                    tool: analysis.tool,
                    value: `P95: ${a.latency.p95}ms`,
                    threshold: '1000ms',
                });
            }
            
            // High error rate
            const errorRate = (a.errors.total / a.requests.total) * 100;
            if (errorRate > 1) {
                this.analysis.bottlenecks.push({
                    type: 'High Error Rate',
                    severity: errorRate > 5 ? 'Critical' : 'Warning',
                    tool: analysis.tool,
                    value: `${errorRate.toFixed(2)}%`,
                    threshold: '1%',
                });
            }
            
            // Low throughput
            if (a.requests.rate && a.requests.rate < 100) {
                this.analysis.bottlenecks.push({
                    type: 'Low Throughput',
                    severity: 'Warning',
                    tool: analysis.tool,
                    value: `${a.requests.rate.toFixed(0)} req/s`,
                    threshold: '100 req/s',
                });
            }
        }
    }
    
    // Generate performance recommendations
    generateRecommendations(analyses) {
        this.analysis.recommendations = [];
        
        // Based on bottlenecks
        const hasHighLatency = this.analysis.bottlenecks.some(b => b.type === 'High Latency');
        const hasHighErrors = this.analysis.bottlenecks.some(b => b.type === 'High Error Rate');
        const hasLowThroughput = this.analysis.bottlenecks.some(b => b.type === 'Low Throughput');
        
        if (hasHighLatency) {
            this.analysis.recommendations.push({
                category: 'Performance',
                priority: 'High',
                recommendation: 'Optimize database queries and add caching',
                details: [
                    'Implement Redis caching for frequently accessed data',
                    'Add database query indexing',
                    'Use connection pooling',
                    'Consider query optimization and pagination',
                ],
            });
        }
        
        if (hasHighErrors) {
            this.analysis.recommendations.push({
                category: 'Reliability',
                priority: 'Critical',
                recommendation: 'Improve error handling and retry logic',
                details: [
                    'Implement circuit breakers',
                    'Add retry logic with exponential backoff',
                    'Improve error logging and monitoring',
                    'Add rate limiting to prevent overload',
                ],
            });
        }
        
        if (hasLowThroughput) {
            this.analysis.recommendations.push({
                category: 'Scalability',
                priority: 'Medium',
                recommendation: 'Scale horizontally and optimize resources',
                details: [
                    'Implement load balancing',
                    'Add horizontal scaling with multiple instances',
                    'Optimize server configurations',
                    'Consider using a CDN for static assets',
                ],
            });
        }
        
        // WebSocket specific recommendations
        const wsAnalysis = analyses.find(a => a.analysis.websocket?.connections > 0);
        if (wsAnalysis && wsAnalysis.analysis.websocket.connections > 500) {
            this.analysis.recommendations.push({
                category: 'WebSocket',
                priority: 'Medium',
                recommendation: 'Optimize WebSocket handling',
                details: [
                    'Implement WebSocket connection pooling',
                    'Use Socket.IO Redis adapter for scaling',
                    'Optimize message broadcasting',
                    'Consider using WebSocket compression',
                ],
            });
        }
    }
    
    // Display analysis results
    displayResults() {
        console.log(chalk.cyan('\n' + '='.repeat(70)));
        console.log(chalk.cyan('📊 LOAD TEST ANALYSIS REPORT'));
        console.log(chalk.cyan('='.repeat(70)));
        
        // Summary
        console.log(chalk.yellow('\n📈 Summary:'));
        const summaryTable = new Table({
            colWidths: [30, 40],
        });
        
        summaryTable.push(
            ['Total Tests', this.analysis.summary.totalTests],
            ['Total Requests', this.analysis.summary.totalRequests.toLocaleString()],
            ['Total Errors', this.analysis.summary.totalErrors.toLocaleString()],
            ['Error Rate', `${this.analysis.summary.errorRate}%`],
            ['Average P95 Latency', `${this.analysis.summary.averageP95Latency}ms`],
            ['Average P99 Latency', `${this.analysis.summary.averageP99Latency}ms`],
            ['Tools Used', this.analysis.summary.tools.join(', ')],
        );
        
        console.log(summaryTable.toString());
        
        // Bottlenecks
        if (this.analysis.bottlenecks.length > 0) {
            console.log(chalk.yellow('\n⚠️  Bottlenecks Identified:'));
            const bottleneckTable = new Table({
                head: ['Type', 'Severity', 'Tool', 'Value', 'Threshold'],
                colWidths: [20, 12, 12, 15, 15],
                style: { head: ['cyan'] },
            });
            
            for (const bottleneck of this.analysis.bottlenecks) {
                const severity = bottleneck.severity === 'Critical' 
                    ? chalk.red(bottleneck.severity)
                    : chalk.yellow(bottleneck.severity);
                
                bottleneckTable.push([
                    bottleneck.type,
                    severity,
                    bottleneck.tool,
                    bottleneck.value,
                    bottleneck.threshold,
                ]);
            }
            
            console.log(bottleneckTable.toString());
        } else {
            console.log(chalk.green('\n✅ No significant bottlenecks identified'));
        }
        
        // Recommendations
        if (this.analysis.recommendations.length > 0) {
            console.log(chalk.yellow('\n💡 Recommendations:'));
            
            for (const rec of this.analysis.recommendations) {
                const priority = rec.priority === 'Critical' 
                    ? chalk.red(`[${rec.priority}]`)
                    : rec.priority === 'High'
                    ? chalk.yellow(`[${rec.priority}]`)
                    : chalk.blue(`[${rec.priority}]`);
                
                console.log(`\n${priority} ${chalk.white(rec.recommendation)}`);
                console.log(chalk.gray(`  Category: ${rec.category}`));
                
                for (const detail of rec.details) {
                    console.log(chalk.gray(`  • ${detail}`));
                }
            }
        }
        
        // Test details
        console.log(chalk.yellow('\n📝 Test Details:'));
        const detailsTable = new Table({
            head: ['Tool', 'Timestamp', 'Requests', 'Errors', 'P95 Latency'],
            colWidths: [15, 25, 12, 12, 15],
            style: { head: ['cyan'] },
        });
        
        for (const result of this.results.slice(0, 10)) {
            let analysis;
            switch (result.tool) {
                case 'K6':
                    analysis = this.analyzeK6Results(result);
                    break;
                case 'Artillery':
                    analysis = this.analyzeArtilleryResults(result);
                    break;
                case 'Autocannon':
                    analysis = this.analyzeAutocannonResults(result);
                    break;
                default:
                    continue;
            }
            
            detailsTable.push([
                result.tool,
                new Date(result.timestamp).toLocaleString(),
                analysis.requests.total.toLocaleString(),
                analysis.errors.total.toLocaleString(),
                `${(analysis.latency.p95 || 0).toFixed(0)}ms`,
            ]);
        }
        
        console.log(detailsTable.toString());
    }
    
    // Generate HTML report
    generateHTMLReport() {
        const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #333;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
        }
        .stat-label {
            margin-top: 5px;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f5f5f5;
            font-weight: bold;
        }
        .critical { color: #e74c3c; font-weight: bold; }
        .warning { color: #f39c12; font-weight: bold; }
        .success { color: #27ae60; font-weight: bold; }
        .recommendation {
            background: #f8f9fa;
            padding: 15px;
            border-right: 4px solid #667eea;
            margin: 10px 0;
            border-radius: 5px;
        }
        .timestamp {
            text-align: center;
            color: #666;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 تقرير تحليل اختبار الضغط</h1>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${this.analysis.summary.totalTests}</div>
                <div class="stat-label">إجمالي الاختبارات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(this.analysis.summary.totalRequests / 1000).toFixed(1)}K</div>
                <div class="stat-label">إجمالي الطلبات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.analysis.summary.errorRate}%</div>
                <div class="stat-label">معدل الأخطاء</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.analysis.summary.averageP95Latency}ms</div>
                <div class="stat-label">متوسط P95</div>
            </div>
        </div>
        
        <h2>⚠️ الاختناقات المكتشفة</h2>
        <table>
            <thead>
                <tr>
                    <th>النوع</th>
                    <th>الخطورة</th>
                    <th>الأداة</th>
                    <th>القيمة</th>
                    <th>الحد المسموح</th>
                </tr>
            </thead>
            <tbody>
                ${this.analysis.bottlenecks.map(b => `
                    <tr>
                        <td>${b.type}</td>
                        <td class="${b.severity.toLowerCase()}">${b.severity}</td>
                        <td>${b.tool}</td>
                        <td>${b.value}</td>
                        <td>${b.threshold}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <h2>💡 التوصيات</h2>
        ${this.analysis.recommendations.map(r => `
            <div class="recommendation">
                <h3>${r.recommendation}</h3>
                <p><strong>الفئة:</strong> ${r.category} | <strong>الأولوية:</strong> ${r.priority}</p>
                <ul>
                    ${r.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
        
        <div class="timestamp">
            تم إنشاء التقرير في: ${new Date().toLocaleString('ar-SA')}
        </div>
    </div>
</body>
</html>
        `;
        
        const filename = `analysis-report-${Date.now()}.html`;
        const filepath = path.join(this.resultsDir, filename);
        fs.writeFileSync(filepath, htmlContent);
        
        console.log(chalk.green(`\n📄 HTML report generated: ${filename}`));
    }
    
    // Main execution
    run() {
        this.loadResults();
        
        if (this.results.length === 0) {
            console.log(chalk.yellow('⚠️  No test results found to analyze'));
            return;
        }
        
        this.analyze();
        this.displayResults();
        this.generateHTMLReport();
        
        // Save analysis to JSON
        const analysisFile = path.join(this.resultsDir, `analysis-${Date.now()}.json`);
        fs.writeFileSync(analysisFile, JSON.stringify(this.analysis, null, 2));
        console.log(chalk.green(`\n💾 Analysis saved to: ${path.basename(analysisFile)}`));
    }
}

// Run if executed directly
if (require.main === module) {
    const analyzer = new ResultsAnalyzer();
    analyzer.run();
}

module.exports = ResultsAnalyzer;