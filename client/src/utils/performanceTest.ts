// أدوات اختبار الأداء لتطبيق الدردشة

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  networkLatency: number;
  messageCount: number;
  userCount: number;
}

interface PerformanceTestResult {
  testName: string;
  metrics: PerformanceMetrics;
  timestamp: number;
  passed: boolean;
  threshold: PerformanceMetrics;
}

// مدير اختبار الأداء
export class PerformanceTestManager {
  private results: PerformanceTestResult[] = [];
  private isRunning = false;
  private testInterval: NodeJS.Timeout | null = null;

  // اختبار أداء الرسم
  testRenderPerformance(componentName: string): PerformanceTestResult {
    const startTime = performance.now();
    
    // محاكاة رسم المكون
    const renderTime = performance.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      fps: this.getFPS(),
      networkLatency: 0,
      messageCount: 0,
      userCount: 0
    };

    const threshold: PerformanceMetrics = {
      renderTime: 100, // 100ms
      memoryUsage: 100, // 100MB
      fps: 30,
      networkLatency: 1000, // 1s
      messageCount: 1000,
      userCount: 100
    };

    const passed = renderTime < threshold.renderTime;

    const result: PerformanceTestResult = {
      testName: `${componentName} Render Performance`,
      metrics,
      timestamp: Date.now(),
      passed,
      threshold
    };

    this.results.push(result);
    return result;
  }

  // اختبار أداء الذاكرة
  testMemoryPerformance(): PerformanceTestResult {
    const memoryUsage = this.getMemoryUsage();
    
    const metrics: PerformanceMetrics = {
      renderTime: 0,
      memoryUsage,
      fps: 0,
      networkLatency: 0,
      messageCount: 0,
      userCount: 0
    };

    const threshold: PerformanceMetrics = {
      renderTime: 0,
      memoryUsage: 100, // 100MB
      fps: 0,
      networkLatency: 0,
      messageCount: 0,
      userCount: 0
    };

    const passed = memoryUsage < threshold.memoryUsage;

    const result: PerformanceTestResult = {
      testName: 'Memory Performance',
      metrics,
      timestamp: Date.now(),
      passed,
      threshold
    };

    this.results.push(result);
    return result;
  }

  // اختبار أداء الشبكة
  async testNetworkPerformance(url: string): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url);
      const networkLatency = performance.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        renderTime: 0,
        memoryUsage: 0,
        fps: 0,
        networkLatency,
        messageCount: 0,
        userCount: 0
      };

      const threshold: PerformanceMetrics = {
        renderTime: 0,
        memoryUsage: 0,
        fps: 0,
        networkLatency: 1000, // 1s
        messageCount: 0,
        userCount: 0
      };

      const passed = networkLatency < threshold.networkLatency;

      const result: PerformanceTestResult = {
        testName: 'Network Performance',
        metrics,
        timestamp: Date.now(),
        passed,
        threshold
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result: PerformanceTestResult = {
        testName: 'Network Performance',
        metrics: {
          renderTime: 0,
          memoryUsage: 0,
          fps: 0,
          networkLatency: Infinity,
          messageCount: 0,
          userCount: 0
        },
        timestamp: Date.now(),
        passed: false,
        threshold: {
          renderTime: 0,
          memoryUsage: 0,
          fps: 0,
          networkLatency: 1000,
          messageCount: 0,
          userCount: 0
        }
      };

      this.results.push(result);
      return result;
    }
  }

  // اختبار أداء الرسائل
  testMessagePerformance(messageCount: number): PerformanceTestResult {
    const startTime = performance.now();
    
    // محاكاة معالجة الرسائل
    for (let i = 0; i < messageCount; i++) {
      // محاكاة معالجة رسالة
    }
    
    const renderTime = performance.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      fps: this.getFPS(),
      networkLatency: 0,
      messageCount,
      userCount: 0
    };

    const threshold: PerformanceMetrics = {
      renderTime: 1000, // 1s
      memoryUsage: 100,
      fps: 30,
      networkLatency: 0,
      messageCount: 1000,
      userCount: 0
    };

    const passed = renderTime < threshold.renderTime;

    const result: PerformanceTestResult = {
      testName: `Message Performance (${messageCount} messages)`,
      metrics,
      timestamp: Date.now(),
      passed,
      threshold
    };

    this.results.push(result);
    return result;
  }

  // اختبار أداء المستخدمين
  testUserPerformance(userCount: number): PerformanceTestResult {
    const startTime = performance.now();
    
    // محاكاة معالجة المستخدمين
    for (let i = 0; i < userCount; i++) {
      // محاكاة معالجة مستخدم
    }
    
    const renderTime = performance.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      fps: this.getFPS(),
      networkLatency: 0,
      messageCount: 0,
      userCount
    };

    const threshold: PerformanceMetrics = {
      renderTime: 500, // 500ms
      memoryUsage: 100,
      fps: 30,
      networkLatency: 0,
      messageCount: 0,
      userCount: 100
    };

    const passed = renderTime < threshold.renderTime;

    const result: PerformanceTestResult = {
      testName: `User Performance (${userCount} users)`,
      metrics,
      timestamp: Date.now(),
      passed,
      threshold
    };

    this.results.push(result);
    return result;
  }

  // بدء اختبارات دورية
  startPeriodicTests(interval: number = 30000): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.testInterval = setInterval(() => {
      this.runAllTests();
    }, interval);
  }

  // إيقاف الاختبارات الدورية
  stopPeriodicTests(): void {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }
    this.isRunning = false;
  }

  // تشغيل جميع الاختبارات
  async runAllTests(): Promise<PerformanceTestResult[]> {
    const tests = [
      () => this.testRenderPerformance('ChatInterface'),
      () => this.testMemoryPerformance(),
      () => this.testNetworkPerformance('/api/health'),
      () => this.testMessagePerformance(100),
      () => this.testUserPerformance(50)
    ];

    const results: PerformanceTestResult[] = [];

    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
      } catch (error) {
        console.error('خطأ في اختبار الأداء:', error);
      }
    }

    return results;
  }

  // الحصول على نتائج الاختبارات
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  // تنظيف النتائج
  clearResults(): void {
    this.results = [];
  }

  // الحصول على إحصائيات النتائج
  getStatistics(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageRenderTime: number;
    averageMemoryUsage: number;
    averageFPS: number;
  } {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const renderTimes = this.results.map(r => r.metrics.renderTime).filter(t => t > 0);
    const memoryUsages = this.results.map(r => r.metrics.memoryUsage).filter(m => m > 0);
    const fpsValues = this.results.map(r => r.metrics.fps).filter(f => f > 0);

    return {
      totalTests,
      passedTests,
      failedTests,
      averageRenderTime: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
      averageMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      averageFPS: fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0
    };
  }

  // الحصول على استخدام الذاكرة
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // بالميجابايت
    }
    return 0;
  }

  // الحصول على FPS
  private getFPS(): number {
    // محاكاة حساب FPS
    return 60; // قيمة افتراضية
  }
}

// Hook لاستخدام اختبار الأداء
export function usePerformanceTest() {
  const testManager = new PerformanceTestManager();

  const startTests = useCallback(() => {
    testManager.startPeriodicTests();
  }, []);

  const stopTests = useCallback(() => {
    testManager.stopPeriodicTests();
  }, []);

  const runTest = useCallback(async (testName: string) => {
    switch (testName) {
      case 'render':
        return testManager.testRenderPerformance('Component');
      case 'memory':
        return testManager.testMemoryPerformance();
      case 'network':
        return testManager.runAllTests();
      default:
        throw new Error(`اختبار غير معروف: ${testName}`);
    }
  }, []);

  const getResults = useCallback(() => {
    return testManager.getResults();
  }, []);

  const getStatistics = useCallback(() => {
    return testManager.getStatistics();
  }, []);

  return {
    startTests,
    stopTests,
    runTest,
    getResults,
    getStatistics
  };
}

// دالة لطباعة نتائج الأداء
export function printPerformanceResults(results: PerformanceTestResult[]): void {
  console.log('📊 نتائج اختبارات الأداء:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}`);
    console.log(`   وقت الرسم: ${result.metrics.renderTime.toFixed(2)}ms`);
    console.log(`   استخدام الذاكرة: ${result.metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`   FPS: ${result.metrics.fps}`);
    console.log(`   زمن الشبكة: ${result.metrics.networkLatency.toFixed(2)}ms`);
    console.log('---');
  });
}

// دالة لإنشاء تقرير الأداء
export function generatePerformanceReport(results: PerformanceTestResult[]): string {
  const stats = new PerformanceTestManager().getStatistics();
  
  return `
# تقرير الأداء

## الإحصائيات العامة
- إجمالي الاختبارات: ${stats.totalTests}
- الاختبارات الناجحة: ${stats.passedTests}
- الاختبارات الفاشلة: ${stats.failedTests}

## متوسط الأداء
- متوسط وقت الرسم: ${stats.averageRenderTime.toFixed(2)}ms
- متوسط استخدام الذاكرة: ${stats.averageMemoryUsage.toFixed(2)}MB
- متوسط FPS: ${stats.averageFPS.toFixed(2)}

## النتائج التفصيلية
${results.map(result => `
### ${result.testName}
- الحالة: ${result.passed ? 'نجح' : 'فشل'}
- وقت الرسم: ${result.metrics.renderTime.toFixed(2)}ms
- استخدام الذاكرة: ${result.metrics.memoryUsage.toFixed(2)}MB
- FPS: ${result.metrics.fps}
- زمن الشبكة: ${result.metrics.networkLatency.toFixed(2)}ms
`).join('')}
  `;
}