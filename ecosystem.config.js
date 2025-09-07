module.exports = {
  apps: [{
    name: 'chat-app',
    script: './dist/index.js',
    instances: 1, // تشغيل عملية واحدة لضمان توحيد الحالة
    exec_mode: 'fork', // وضع فردي بدون Cluster
    node_args: '--expose-gc --max-old-space-size=400',
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    },
    max_memory_restart: '400M',
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