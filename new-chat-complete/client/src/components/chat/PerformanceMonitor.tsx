import { useState, useEffect, useRef } from 'react';

import { usePerformanceOptimization } from '@/lib/chatOptimization';
import { apiRequest } from '@/lib/queryClient';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  connectionLatency: number;
  messagesPerSecond: number;
}

interface PerformanceMonitorProps {
  isVisible: boolean;
}

export default function PerformanceMonitor({ isVisible }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    connectionLatency: 0,
    messagesPerSecond: 0,
  });

  const { networkOptimizer, renderCount } = usePerformanceOptimization();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const messageCount = useRef(0);
  const lastMessageTime = useRef(Date.now());

  // حساب FPS
  useEffect(() => {
    let animationFrame: number;

    const calculateFPS = () => {
      frameCount.current++;
      const now = performance.now();

      if (now - lastTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));

        setMetrics((prev) => ({
          ...prev,
          fps,
          renderTime: now - lastTime.current,
        }));

        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrame = requestAnimationFrame(calculateFPS);
    };

    if (isVisible) {
      calculateFPS();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible]);

  // مراقبة استخدام الذاكرة (تعمل فقط عند الظهور)
  useEffect(() => {
    if (!isVisible) return;
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);

        setMetrics((prev) => ({
          ...prev,
          memoryUsage: usedMB,
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // مراقبة زمن الاستجابة (تعمل فقط عند الظهور)
  useEffect(() => {
    if (!isVisible) return;
    const measureLatency = async () => {
      const start = performance.now();
      try {
        await apiRequest('/api/ping');
        const latency = performance.now() - start;

        setMetrics((prev) => ({
          ...prev,
          connectionLatency: Math.round(latency),
        }));
      } catch (error) {
        setMetrics((prev) => ({
          ...prev,
          connectionLatency: -1,
        }));
      }
    };

    const interval = setInterval(measureLatency, 5000);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const getPerformanceColor = (value: number, type: 'fps' | 'memory' | 'latency') => {
    switch (type) {
      case 'fps':
        if (value >= 50) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      case 'memory':
        if (value <= 50) return 'text-green-400';
        if (value <= 100) return 'text-yellow-400';
        return 'text-red-400';
      case 'latency':
        if (value <= 100) return 'text-green-400';
        if (value <= 300) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50 min-w-48">
      <div className="text-center font-bold mb-2 text-blue-400">⚡ مراقب الأداء</div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={getPerformanceColor(metrics.fps, 'fps')}>{metrics.fps}</span>
        </div>

        <div className="flex justify-between">
          <span>الذاكرة:</span>
          <span className={getPerformanceColor(metrics.memoryUsage, 'memory')}>
            {metrics.memoryUsage}MB
          </span>
        </div>

        <div className="flex justify-between">
          <span>الزمن:</span>
          <span className={getPerformanceColor(metrics.connectionLatency, 'latency')}>
            {metrics.connectionLatency === -1 ? 'خطأ' : `${metrics.connectionLatency}ms`}
          </span>
        </div>

        <div className="flex justify-between">
          <span>الرسوم:</span>
          <span className="text-blue-400">{renderCount}</span>
        </div>

        <div className="flex justify-between">
          <span>الرسائل/ث:</span>
          <span className="text-purple-400">{metrics.messagesPerSecond}</span>
        </div>
      </div>

      {/* مؤشرات حالة الأداء */}
      <div className="mt-2 pt-2 border-t border-gray-600">
        <div className="flex justify-between text-xs">
          <span>الحالة:</span>
          <span
            className={
              metrics.fps >= 50 && metrics.memoryUsage <= 100 && metrics.connectionLatency <= 200
                ? 'text-green-400'
                : 'text-yellow-400'
            }
          >
            {metrics.fps >= 50 && metrics.memoryUsage <= 100 && metrics.connectionLatency <= 200
              ? '✓ ممتاز'
              : '⚠ معتدل'}
          </span>
        </div>
      </div>
    </div>
  );
}
