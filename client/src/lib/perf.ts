type PerfPayload = {
  name: string;
  value: number;
  detail?: any;
  ts?: number;
};

function send(payload: PerfPayload) {
  try {
    const blob = new Blob([JSON.stringify({ ...payload, ts: Date.now() })], {
      type: 'application/json',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/perf', blob);
    } else {
      fetch('/api/perf', { method: 'POST', body: blob, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  } catch {}
}

function reportPaints() {
  try {
    const paints = performance.getEntriesByType('paint') as PerformanceEntry[];
    for (const p of paints) {
      if (p.name === 'first-contentful-paint') {
        send({ name: 'FCP', value: p.startTime });
      }
    }
  } catch {}
}

function observeLCP() {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) {
        send({ name: 'LCP', value: last.renderTime || last.loadTime || last.startTime });
      }
    });
    // @ts-expect-error: buffered exists in browsers
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
}

function observeCLS() {
  try {
    let cls = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) {
          cls += entry.value || 0;
          send({ name: 'CLS', value: cls });
        }
      }
    });
    // @ts-expect-error: buffered exists in browsers
    po.observe({ type: 'layout-shift', buffered: true });
  } catch {}
}

function observeFID() {
  try {
    const po = new PerformanceObserver((list) => {
      const first = list.getEntries()[0] as PerformanceEventTiming | undefined;
      if (first) send({ name: 'FID', value: first.processingStart - first.startTime });
    });
    // @ts-expect-error: buffered exists in browsers
    po.observe({ type: 'first-input', buffered: true });
  } catch {}
}

function reportNavigation() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;
    send({ name: 'TTFB', value: nav.responseStart });
  } catch {}
}

function observeMeasures() {
  try {
    const po = new PerformanceObserver((list) => {
      for (const m of list.getEntriesByType('measure')) {
        if (m.name.startsWith('app:') || m.name.startsWith('socket:')) {
          send({ name: m.name, value: m.duration });
        }
      }
    });
    // @ts-expect-error new types
    po.observe({ type: 'measure', buffered: true });
  } catch {}
}

export function initPerfMonitoring(): void {
  if (typeof window === 'undefined' || !(window as any).performance) return;
  try {
    reportNavigation();
    reportPaints();
    observeLCP();
    observeCLS();
    observeFID();
    observeMeasures();
  } catch {}
}

