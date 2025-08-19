import { useEffect, useRef } from 'react';

interface CleanupManager {
  timeouts: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  listeners: Array<{ target: any; event: string; handler: any }>;
  abortControllers: Set<AbortController>;
}

export function useCleanup() {
  const cleanupRef = useRef<CleanupManager>({
    timeouts: new Set(),
    intervals: new Set(),
    listeners: [],
    abortControllers: new Set()
  });

  // Safe setTimeout wrapper
  const setTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = global.setTimeout(callback, delay);
    cleanupRef.current.timeouts.add(timeout);
    return timeout;
  };

  // Safe setInterval wrapper
  const setInterval = (callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = global.setInterval(callback, delay);
    cleanupRef.current.intervals.add(interval);
    return interval;
  };

  // Safe addEventListener wrapper
  const addEventListener = <K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    event: K,
    handler: (ev: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) => {
    target.addEventListener(event, handler as any, options);
    cleanupRef.current.listeners.push({ target, event, handler });
  };

  // Create AbortController for cancellable operations
  const createAbortController = (): AbortController => {
    const controller = new AbortController();
    cleanupRef.current.abortControllers.add(controller);
    return controller;
  };

  // Clear specific timeout
  const clearTimeout = (timeout: NodeJS.Timeout | undefined) => {
    if (timeout) {
      global.clearTimeout(timeout);
      cleanupRef.current.timeouts.delete(timeout);
    }
  };

  // Clear specific interval
  const clearInterval = (interval: NodeJS.Timeout | undefined) => {
    if (interval) {
      global.clearInterval(interval);
      cleanupRef.current.intervals.delete(interval);
    }
  };

  // Cleanup all resources
  const cleanup = () => {
    // Clear all timeouts
    cleanupRef.current.timeouts.forEach(timeout => {
      global.clearTimeout(timeout);
    });
    cleanupRef.current.timeouts.clear();

    // Clear all intervals
    cleanupRef.current.intervals.forEach(interval => {
      global.clearInterval(interval);
    });
    cleanupRef.current.intervals.clear();

    // Remove all event listeners
    cleanupRef.current.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    cleanupRef.current.listeners = [];

    // Abort all controllers
    cleanupRef.current.abortControllers.forEach(controller => {
      controller.abort();
    });
    cleanupRef.current.abortControllers.clear();
  };

  // Auto cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    setTimeout,
    setInterval,
    addEventListener,
    createAbortController,
    clearTimeout,
    clearInterval,
    cleanup
  };
}