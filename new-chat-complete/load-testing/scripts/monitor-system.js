#!/usr/bin/env node

/**
 * System Monitor for Load Testing
 * Monitors system resources during load tests
 */

const si = require('systeminformation');
const chalk = require('chalk');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
    constructor() {
        this.interval = 5000; // 5 seconds
        this.metrics = [];
        this.isRunning = false;
        this.startTime = null;
        this.outputFile = path.join(__dirname, '..', 'results', `system-metrics-${Date.now()}.json`);
    }
    
    // Start monitoring
    async start() {
        console.log(chalk.cyan('🔍 Starting System Monitor...'));
        console.log(chalk.yellow(`📊 Collecting metrics every ${this.interval / 1000} seconds`));
        console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Initial collection
        await this.collectMetrics();
        
        // Set up interval
        this.monitorInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.collectMetrics();
            }
        }, this.interval);
    }
    
    // Collect system metrics
    async collectMetrics() {
        try {
            const timestamp = Date.now();
            
            // CPU information
            const cpuLoad = await si.currentLoad();
            const cpuTemp = await si.cpuTemperature();
            
            // Memory information
            const memory = await si.mem();
            
            // Network information
            const network = await si.networkStats();
            
            // Disk information
            const disk = await si.fsStats();
            
            // Process information
            const processes = await si.processes();
            
            // Docker containers (if any)
            const docker = await si.dockerContainers();
            
            const metrics = {
                timestamp: timestamp,
                elapsed: (timestamp - this.startTime) / 1000,
                cpu: {
                    usage: cpuLoad.currentLoad.toFixed(2),
                    user: cpuLoad.currentLoadUser.toFixed(2),
                    system: cpuLoad.currentLoadSystem.toFixed(2),
                    idle: cpuLoad.currentLoadIdle.toFixed(2),
                    temperature: cpuTemp.main || 'N/A',
                    cores: cpuLoad.cpus.map(cpu => ({
                        usage: cpu.load.toFixed(2),
                    })),
                },
                memory: {
                    total: (memory.total / 1024 / 1024 / 1024).toFixed(2), // GB
                    used: (memory.used / 1024 / 1024 / 1024).toFixed(2), // GB
                    free: (memory.free / 1024 / 1024 / 1024).toFixed(2), // GB
                    usage: ((memory.used / memory.total) * 100).toFixed(2),
                    swap: {
                        total: (memory.swaptotal / 1024 / 1024 / 1024).toFixed(2),
                        used: (memory.swapused / 1024 / 1024 / 1024).toFixed(2),
                        usage: memory.swaptotal > 0 
                            ? ((memory.swapused / memory.swaptotal) * 100).toFixed(2)
                            : 0,
                    },
                },
                network: {
                    rx: (network[0]?.rx_sec / 1024 / 1024).toFixed(2) || 0, // MB/s
                    tx: (network[0]?.tx_sec / 1024 / 1024).toFixed(2) || 0, // MB/s
                    rxTotal: (network[0]?.rx_bytes / 1024 / 1024 / 1024).toFixed(2) || 0, // GB
                    txTotal: (network[0]?.tx_bytes / 1024 / 1024 / 1024).toFixed(2) || 0, // GB
                },
                disk: {
                    read: (disk.rx_sec / 1024 / 1024).toFixed(2), // MB/s
                    write: (disk.wx_sec / 1024 / 1024).toFixed(2), // MB/s
                    totalRead: (disk.rx / 1024 / 1024 / 1024).toFixed(2), // GB
                    totalWrite: (disk.wx / 1024 / 1024 / 1024).toFixed(2), // GB
                },
                processes: {
                    total: processes.all,
                    running: processes.running,
                    sleeping: processes.sleeping,
                    topCPU: processes.list
                        .sort((a, b) => b.cpu - a.cpu)
                        .slice(0, 5)
                        .map(p => ({
                            name: p.name,
                            cpu: p.cpu.toFixed(2),
                            memory: p.mem.toFixed(2),
                        })),
                },
                docker: docker.length > 0 ? docker.map(c => ({
                    name: c.name,
                    state: c.state,
                    cpu: c.cpuPercent?.toFixed(2) || 0,
                    memory: c.memPercent?.toFixed(2) || 0,
                })) : [],
            };
            
            this.metrics.push(metrics);
            this.displayMetrics(metrics);
            
            // Check for alerts
            this.checkAlerts(metrics);
            
        } catch (error) {
            console.error(chalk.red('Error collecting metrics:'), error.message);
        }
    }
    
    // Display metrics in console
    displayMetrics(metrics) {
        // Clear console
        console.clear();
        
        // Header
        console.log(chalk.cyan('═'.repeat(80)));
        console.log(chalk.cyan.bold('                        SYSTEM MONITOR                        '));
        console.log(chalk.cyan('═'.repeat(80)));
        console.log(chalk.white(`⏱️  Elapsed: ${this.formatTime(metrics.elapsed)}`));
        console.log(chalk.white(`📅 Time: ${new Date(metrics.timestamp).toLocaleTimeString()}`));
        console.log();
        
        // CPU & Memory Table
        const resourceTable = new Table({
            head: ['Resource', 'Usage', 'Details'],
            colWidths: [15, 20, 45],
            style: { head: ['cyan'] },
        });
        
        // CPU row
        const cpuColor = metrics.cpu.usage > 80 ? chalk.red : 
                        metrics.cpu.usage > 60 ? chalk.yellow : 
                        chalk.green;
        
        resourceTable.push([
            '🖥️  CPU',
            cpuColor(`${metrics.cpu.usage}%`),
            `User: ${metrics.cpu.user}% | System: ${metrics.cpu.system}% | Idle: ${metrics.cpu.idle}%`
        ]);
        
        // Memory row
        const memColor = metrics.memory.usage > 85 ? chalk.red :
                        metrics.memory.usage > 70 ? chalk.yellow :
                        chalk.green;
        
        resourceTable.push([
            '💾 Memory',
            memColor(`${metrics.memory.usage}%`),
            `Used: ${metrics.memory.used}GB / ${metrics.memory.total}GB | Free: ${metrics.memory.free}GB`
        ]);
        
        // Network row
        resourceTable.push([
            '🌐 Network',
            `↓ ${metrics.network.rx} MB/s\n↑ ${metrics.network.tx} MB/s`,
            `Total: ↓ ${metrics.network.rxTotal}GB | ↑ ${metrics.network.txTotal}GB`
        ]);
        
        // Disk row
        resourceTable.push([
            '💿 Disk I/O',
            `R: ${metrics.disk.read} MB/s\nW: ${metrics.disk.write} MB/s`,
            `Total: R: ${metrics.disk.totalRead}GB | W: ${metrics.disk.totalWrite}GB`
        ]);
        
        console.log(resourceTable.toString());
        
        // Top Processes
        console.log(chalk.yellow('\n📊 Top Processes by CPU:'));
        const processTable = new Table({
            head: ['Process', 'CPU %', 'Memory %'],
            colWidths: [30, 15, 15],
            style: { head: ['cyan'] },
        });
        
        for (const proc of metrics.processes.topCPU) {
            processTable.push([
                proc.name.substring(0, 28),
                proc.cpu + '%',
                proc.memory + '%'
            ]);
        }
        
        console.log(processTable.toString());
        
        // Docker Containers (if any)
        if (metrics.docker.length > 0) {
            console.log(chalk.yellow('\n🐳 Docker Containers:'));
            const dockerTable = new Table({
                head: ['Container', 'State', 'CPU %', 'Memory %'],
                colWidths: [25, 12, 12, 12],
                style: { head: ['cyan'] },
            });
            
            for (const container of metrics.docker) {
                dockerTable.push([
                    container.name.substring(0, 23),
                    container.state,
                    container.cpu + '%',
                    container.memory + '%'
                ]);
            }
            
            console.log(dockerTable.toString());
        }
        
        // Statistics
        if (this.metrics.length > 1) {
            console.log(chalk.yellow('\n📈 Statistics:'));
            const stats = this.calculateStatistics();
            
            const statsTable = new Table({
                colWidths: [20, 60],
            });
            
            statsTable.push(
                ['CPU (avg/max)', `${stats.cpu.avg}% / ${stats.cpu.max}%`],
                ['Memory (avg/max)', `${stats.memory.avg}% / ${stats.memory.max}%`],
                ['Network (avg rx/tx)', `${stats.network.avgRx} MB/s / ${stats.network.avgTx} MB/s`],
                ['Samples Collected', this.metrics.length]
            );
            
            console.log(statsTable.toString());
        }
        
        console.log(chalk.gray('\nPress Ctrl+C to stop monitoring...'));
    }
    
    // Check for alerts
    checkAlerts(metrics) {
        const alerts = [];
        
        // CPU alert
        if (metrics.cpu.usage > 90) {
            alerts.push(chalk.red(`⚠️  HIGH CPU USAGE: ${metrics.cpu.usage}%`));
        }
        
        // Memory alert
        if (metrics.memory.usage > 90) {
            alerts.push(chalk.red(`⚠️  HIGH MEMORY USAGE: ${metrics.memory.usage}%`));
        }
        
        // Swap alert
        if (metrics.memory.swap.usage > 50) {
            alerts.push(chalk.yellow(`⚠️  SWAP USAGE: ${metrics.memory.swap.usage}%`));
        }
        
        // Display alerts
        if (alerts.length > 0) {
            console.log(chalk.red('\n🚨 ALERTS:'));
            alerts.forEach(alert => console.log(alert));
        }
    }
    
    // Calculate statistics
    calculateStatistics() {
        const cpuValues = this.metrics.map(m => parseFloat(m.cpu.usage));
        const memValues = this.metrics.map(m => parseFloat(m.memory.usage));
        const rxValues = this.metrics.map(m => parseFloat(m.network.rx));
        const txValues = this.metrics.map(m => parseFloat(m.network.tx));
        
        return {
            cpu: {
                avg: (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2),
                max: Math.max(...cpuValues).toFixed(2),
                min: Math.min(...cpuValues).toFixed(2),
            },
            memory: {
                avg: (memValues.reduce((a, b) => a + b, 0) / memValues.length).toFixed(2),
                max: Math.max(...memValues).toFixed(2),
                min: Math.min(...memValues).toFixed(2),
            },
            network: {
                avgRx: (rxValues.reduce((a, b) => a + b, 0) / rxValues.length).toFixed(2),
                avgTx: (txValues.reduce((a, b) => a + b, 0) / txValues.length).toFixed(2),
                maxRx: Math.max(...rxValues).toFixed(2),
                maxTx: Math.max(...txValues).toFixed(2),
            },
        };
    }
    
    // Format time
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    // Stop monitoring
    stop() {
        this.isRunning = false;
        clearInterval(this.monitorInterval);
        
        // Save metrics to file
        fs.writeFileSync(this.outputFile, JSON.stringify(this.metrics, null, 2));
        
        console.log(chalk.green(`\n✅ Monitoring stopped`));
        console.log(chalk.green(`💾 Metrics saved to: ${path.basename(this.outputFile)}`));
        
        // Display final statistics
        if (this.metrics.length > 0) {
            const stats = this.calculateStatistics();
            console.log(chalk.cyan('\n📊 Final Statistics:'));
            console.log(chalk.white(`   CPU - Avg: ${stats.cpu.avg}% | Max: ${stats.cpu.max}%`));
            console.log(chalk.white(`   Memory - Avg: ${stats.memory.avg}% | Max: ${stats.memory.max}%`));
            console.log(chalk.white(`   Network - Avg: ↓${stats.network.avgRx} MB/s | ↑${stats.network.avgTx} MB/s`));
            console.log(chalk.white(`   Duration: ${this.formatTime((Date.now() - this.startTime) / 1000)}`));
            console.log(chalk.white(`   Samples: ${this.metrics.length}`));
        }
    }
}

// Main execution
if (require.main === module) {
    const monitor = new SystemMonitor();
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        monitor.stop();
        process.exit(0);
    });
    
    // Start monitoring
    monitor.start().catch(console.error);
}

module.exports = SystemMonitor;