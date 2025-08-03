import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  memoryUsage?: number;
  fps?: number;
}

interface PerformanceMonitorOptions {
  componentName?: string;
  enableLogging?: boolean;
  logThreshold?: number; // بالمللي ثانية
  trackMemory?: boolean;
  trackFPS?: boolean;
}

// Hook لمراقبة أداء المكونات
export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    componentName = 'Unknown',
    enableLogging = false,
    logThreshold = 100,
    trackMemory = true,
    trackFPS = false
  } = options;

  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const fpsRef = useRef<number[]>([]);
  const frameCountRef = useRef(0);
  const lastFPSUpdateRef = useRef(0);

  // قياس وقت الرسم
  const measureRenderTime = useCallback(() => {
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;
    
    renderCountRef.current++;
    
    if (enableLogging && renderTime > logThreshold) {
      console.warn(`🐌 مكون بطيء: ${componentName} استغرق ${renderTime.toFixed(2)}ms للرسم`);
    }
    
    lastRenderTimeRef.current = now;
    
    return renderTime;
  }, [componentName, enableLogging, logThreshold]);

  // قياس استخدام الذاكرة
  const measureMemoryUsage = useCallback(() => {
    if (!trackMemory || !('memory' in performance)) {
      return undefined;
    }
    
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    
    if (enableLogging && usedMB > 100) {
      console.warn(`💾 استخدام ذاكرة مرتفع: ${usedMB.toFixed(2)} MB`);
    }
    
    return usedMB;
  }, [trackMemory, enableLogging]);

  // قياس FPS
  const measureFPS = useCallback(() => {
    if (!trackFPS) {
      return undefined;
    }
    
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastFPSUpdateRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastFPSUpdateRef.current));
      fpsRef.current.push(fps);
      
      // الاحتفاظ بآخر 10 قياسات فقط
      if (fpsRef.current.length > 10) {
        fpsRef.current.shift();
      }
      
      frameCountRef.current = 0;
      lastFPSUpdateRef.current = now;
      
      if (enableLogging && fps < 30) {
        console.warn(`📉 FPS منخفض: ${fps} fps`);
      }
      
      return fps;
    }
    
    return undefined;
  }, [trackFPS, enableLogging]);

  // مراقبة الأداء
  useEffect(() => {
    const startTime = performance.now();
    lastRenderTimeRef.current = startTime;
    
    return () => {
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      if (enableLogging) {
        console.log(`📊 ${componentName}: ${renderCountRef.current} رسم في ${totalTime.toFixed(2)}ms`);
      }
    };
  }, [componentName, enableLogging]);

  // مراقبة FPS
  useEffect(() => {
    if (!trackFPS) return;
    
    let animationFrameId: number;
    
    const measureFrame = () => {
      measureFPS();
      animationFrameId = requestAnimationFrame(measureFrame);
    };
    
    animationFrameId = requestAnimationFrame(measureFrame);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [trackFPS, measureFPS]);

  // الحصول على المقاييس الحالية
  const getMetrics = useCallback((): PerformanceMetrics => {
    const renderTime = performance.now() - lastRenderTimeRef.current;
    const memoryUsage = measureMemoryUsage();
    const fps = fpsRef.current.length > 0 ? fpsRef.current[fpsRef.current.length - 1] : undefined;
    
    return {
      renderTime,
      renderCount: renderCountRef.current,
      memoryUsage,
      fps
    };
  }, [measureMemoryUsage]);

  return {
    measureRenderTime,
    getMetrics,
    renderCount: renderCountRef.current
  };
}

// Hook لمراقبة أداء الشبكة
export function useNetworkPerformance() {
  const networkMetricsRef = useRef({
    requestCount: 0,
    totalResponseTime: 0,
    failedRequests: 0,
    averageResponseTime: 0
  });

  const measureRequest = useCallback((responseTime: number, success: boolean) => {
    const metrics = networkMetricsRef.current;
    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime = metrics.totalResponseTime / metrics.requestCount;
    
    if (!success) {
      metrics.failedRequests++;
    }
  }, []);

  const getNetworkMetrics = useCallback(() => {
    return { ...networkMetricsRef.current };
  }, []);

  return {
    measureRequest,
    getNetworkMetrics
  };
}

// Hook لمراقبة أداء Socket.IO
export function useSocketPerformance() {
  const socketMetricsRef = useRef({
    messageCount: 0,
    connectionTime: 0,
    reconnectCount: 0,
    lastMessageTime: 0
  });

  const measureMessage = useCallback(() => {
    socketMetricsRef.current.messageCount++;
    socketMetricsRef.current.lastMessageTime = Date.now();
  }, []);

  const measureConnection = useCallback((connectionTime: number) => {
    socketMetricsRef.current.connectionTime = connectionTime;
  }, []);

  const measureReconnect = useCallback(() => {
    socketMetricsRef.current.reconnectCount++;
  }, []);

  const getSocketMetrics = useCallback(() => {
    return { ...socketMetricsRef.current };
  }, []);

  return {
    measureMessage,
    measureConnection,
    measureReconnect,
    getSocketMetrics
  };
}

// Hook لمراقبة أداء قاعدة البيانات
export function useDatabasePerformance() {
  const dbMetricsRef = useRef({
    queryCount: 0,
    totalQueryTime: 0,
    averageQueryTime: 0,
    slowQueries: 0
  });

  const measureQuery = useCallback((queryTime: number) => {
    const metrics = dbMetricsRef.current;
    metrics.queryCount++;
    metrics.totalQueryTime += queryTime;
    metrics.averageQueryTime = metrics.totalQueryTime / metrics.queryCount;
    
    if (queryTime > 1000) { // أكثر من ثانية واحدة
      metrics.slowQueries++;
    }
  }, []);

  const getDatabaseMetrics = useCallback(() => {
    return { ...dbMetricsRef.current };
  }, []);

  return {
    measureQuery,
    getDatabaseMetrics
  };
}

// Hook لمراقبة أداء التطبيق الشامل
export function useAppPerformance() {
  const appMetricsRef = useRef({
    startTime: Date.now(),
    totalRenders: 0,
    memoryLeaks: 0,
    errors: 0
  });

  const measureAppStart = useCallback(() => {
    appMetricsRef.current.startTime = Date.now();
  }, []);

  const measureRender = useCallback(() => {
    appMetricsRef.current.totalRenders++;
  }, []);

  const measureError = useCallback(() => {
    appMetricsRef.current.errors++;
  }, []);

  const getAppMetrics = useCallback(() => {
    const uptime = Date.now() - appMetricsRef.current.startTime;
    return {
      ...appMetricsRef.current,
      uptime: Math.floor(uptime / 1000) // بالثواني
    };
  }, []);

  return {
    measureAppStart,
    measureRender,
    measureError,
    getAppMetrics
  };
}

// Hook لمراقبة أداء الذاكرة
export function useMemoryPerformance() {
  const memoryMetricsRef = useRef({
    peakUsage: 0,
    currentUsage: 0,
    cleanupCount: 0,
    lastCleanup: 0
  });

  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      memoryMetricsRef.current.currentUsage = usedMB;
      
      if (usedMB > memoryMetricsRef.current.peakUsage) {
        memoryMetricsRef.current.peakUsage = usedMB;
      }
    }
  }, []);

  const measureCleanup = useCallback(() => {
    memoryMetricsRef.current.cleanupCount++;
    memoryMetricsRef.current.lastCleanup = Date.now();
  }, []);

  const getMemoryMetrics = useCallback(() => {
    return { ...memoryMetricsRef.current };
  }, []);

  return {
    measureMemory,
    measureCleanup,
    getMemoryMetrics
  };
}