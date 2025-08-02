
/**
 * 📈 مراقب النظام المستمر
 */

const monitor = {
  stats: {
    startTime: Date.now(),
    requests: 0,
    errors: 0,
    avgResponseTime: 0
  },
  
  startMonitoring() {
    console.log('📈 بدء مراقبة النظام...');
    
    // مراقبة كل دقيقة
    setInterval(() => {
      this.checkSystemHealth();
    }, 60000);
    
    // تقرير يومي
    setInterval(() => {
      this.generateDailyReport();
    }, 86400000);
  },
  
  checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    console.log(`🏥 فحص صحة النظام:`);
    console.log(`   📊 الذاكرة: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   ⏰ وقت التشغيل: ${Math.round(uptime / 60)} دقيقة`);
    console.log(`   📈 الطلبات: ${this.stats.requests}`);
    console.log(`   ❌ الأخطاء: ${this.stats.errors}`);
  },
  
  generateDailyReport() {
    const report = {
      date: new Date().toISOString().split('T')[0],
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats: this.stats
    };
    
    console.log('📊 تقرير يومي:', report);
  }
};

// بدء المراقبة
if (require.main === module) {
  monitor.startMonitoring();
}

module.exports = monitor;
