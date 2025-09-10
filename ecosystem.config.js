module.exports = {
  apps: [{
    name: 'chat-app',
    script: './dist/index.js',
    instances: 'max', // استخدام جميع المعالجات المتاحة
    exec_mode: 'cluster', // وضع Cluster للتوسع الأفقي
    node_args: '--expose-gc --max-old-space-size=2048',
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    },
    max_memory_restart: '2048M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    watch: false,
    // مراقبة صحة التطبيق
    health_check: {
      interval: 30000, // كل 30 ثانية
      url: 'http://localhost:10000/health',
      max_consecutive_failures: 3
    }
  }]
};