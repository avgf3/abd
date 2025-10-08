/*
 * Socket.IO background ping worker (single, deduplicated implementation)
 * - Does NOT open network connections by itself
 * - Periodically asks the main thread to emit a client_ping when connected
 */

let intervalId = null;
let isConnected = false;
let defaultIntervalMs = 60000; // 60s conservative in background

function stop() {
  try {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  } catch {}
}

function start(intervalMs) {
  stop();
  const ms = Number(intervalMs) > 0 ? Number(intervalMs) : defaultIntervalMs;
  intervalId = setInterval(() => {
    if (isConnected) {
      try {
        postMessage({ type: 'send-ping', data: { ts: Date.now() } });
      } catch {}
    }
  }, ms);
}

self.addEventListener('message', (event) => {
  try {
    const { type, data } = event.data || {};
    switch (type) {
      case 'init': {
        if (data && typeof data.pingInterval === 'number') {
          defaultIntervalMs = Math.max(15000, data.pingInterval | 0);
        }
        try { postMessage({ type: 'worker-ready' }); } catch {}
        break;
      }
      case 'socket-status': {
        isConnected = !!(data && data.connected);
        break;
      }
      case 'start-ping': {
        start((data && data.interval) || defaultIntervalMs);
        break;
      }
      case 'stop-ping': {
        stop();
        break;
      }
      case 'cleanup': {
        stop();
        try { close(); } catch {}
        break;
      }
      default:
        break;
    }
  } catch (e) {
    try {
      postMessage({ type: 'worker-error', data: { error: (e && e.message) || String(e) } });
    } catch {}
  }
});
