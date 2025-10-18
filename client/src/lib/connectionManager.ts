/*
 * ConnectionManager: Polling-based connection similar to competitor site behavior.
 */

export type ConnectionManagerConfig = {
  chatPollUrl: string; // '/api/messages/room/:roomId/since'
  usersPollUrl?: string; // '/api/users/online'
  pingUrl?: string; // '/api/ping'
  errorReportUrl?: string; // '/collect/e.php' if implemented
  roomId?: string;
  token?: string;
  speedVisibleMs?: number;
  speedHiddenMs?: number;
  timeoutMs?: number;
  maxBackoffMs?: number;
};

export class ConnectionManager {
  private isOnline = navigator.onLine;
  private isVisible = document.visibilityState !== 'hidden';
  private pollTimerId: number | null = null;
  private lastMessageId = 0;
  private consecutiveFailures = 0;
  private speedMs: number;
  private lastServerLatency = 0;
  // 🚀 تحسينات ذكية للـ backup polling
  private isSocketConnected = false;
  private shouldBackupPoll = false;
  private backupPollActive = false;

  constructor(private cfg: ConnectionManagerConfig) {
    this.speedMs = this.cfg.speedVisibleMs ?? 1500;
    const speedHidden = this.cfg.speedHiddenMs ?? 4000;

    const updateSpeed = () => {
      this.speedMs = (document.visibilityState !== 'hidden')
        ? (this.cfg.speedVisibleMs ?? 1500)
        : speedHidden;
      try {
        const el = document.getElementById('current_speed');
        if (el) el.textContent = String(this.speedMs);
      } catch {}
    };

    document.addEventListener('visibilitychange', () => {
      this.isVisible = document.visibilityState !== 'hidden';
      updateSpeed();
      if (this.isVisible) this.scheduleNextPoll(1);
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.consecutiveFailures = 0;
      this.scheduleNextPoll(1);
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // معالجة ذكية لـ pageshow: فقط عند العودة من bfcache
    window.addEventListener('pageshow', (event: PageTransitionEvent) => {
      // event.persisted = true يعني الصفحة جاءت من cache، وليست تحميل جديد
      if (event.persisted) {
        // استئناف polling فقط عند العودة من cache
        this.scheduleNextPoll(1);
      }
      // إذا كانت false (تحميل عادي)، لا نفعل شيء لأن start() سيتم استدعاؤه
    });

    window.addEventListener('pagehide', () => {
      if (!this.cfg.pingUrl) return;
      try {
        if (typeof navigator.sendBeacon === 'function') {
          const blob = new Blob(['bg=1'], { type: 'text/plain' });
          navigator.sendBeacon(this.cfg.pingUrl, blob);
        } else {
          fetch(this.cfg.pingUrl, { method: 'GET', cache: 'no-store', keepalive: true, credentials: 'include' }).catch(() => {});
        }
      } catch {}
    });

    // Removed legacy error-report reload trigger; reporting (if any) should not force page reload

    updateSpeed();
  }

  public start() {
    this.scheduleNextPoll(1);
  }

  public stop() {
    if (this.pollTimerId) {
      clearTimeout(this.pollTimerId);
      this.pollTimerId = null;
    }
    this.backupPollActive = false;
  }

  // 🚀 دوال ذكية للـ backup polling
  public setSocketStatus(connected: boolean) {
    this.isSocketConnected = connected;
    
    // 🔥 منطق ذكي: فعل backup polling عند انقطاع Socket
    if (!connected && !this.backupPollActive) {
      this.shouldBackupPoll = true;
      this.backupPollActive = true;
      this.scheduleNextPoll(500); // polling سريع عند انقطاع Socket
    } else if (connected && this.backupPollActive) {
      this.shouldBackupPoll = false;
      this.backupPollActive = false;
      // العودة للسرعة العادية
      this.scheduleNextPoll(this.speedMs);
    }
  }

  public enableBackupMode() {
    this.shouldBackupPoll = true;
    this.backupPollActive = true;
    // تجنب الحمل العالي جداً عند ضعف الشبكة: 2.5s بدلاً من 1s
    this.scheduleNextPoll(2500);
  }

  // Removed legacy forceReload; no page reloads are performed in this manager

  public setLastMessageId(id: number) {
    if (Number.isFinite(id)) this.lastMessageId = Math.max(this.lastMessageId, (id as number) | 0);
  }

  private scheduleNextPoll(delayMs: number) {
    if (this.pollTimerId) clearTimeout(this.pollTimerId);
    this.pollTimerId = window.setTimeout(() => this.pollOnce(), delayMs);
  }

  private backoffDelay(): number {
    const maxBackoff = this.cfg.maxBackoffMs ?? 30000;
    const base = this.cfg.speedVisibleMs ?? 1500;
    const factor = Math.min(maxBackoff, base * Math.pow(2, this.consecutiveFailures));
    return Math.max(this.speedMs, factor);
  }

  // Removed legacy hardReload implementation; fallback is enabled adaptively in code paths below

  private updateMonitors(startedAt: number) {
    try {
      const latency = Math.max(0, Date.now() - startedAt);
      const latEl = document.getElementById('current_latency');
      if (latEl) latEl.textContent = String(latency);
      const srvEl = document.getElementById('server_latency');
      if (srvEl) srvEl.textContent = String(this.lastServerLatency || 0);
    } catch {}
  }

  private pollOnce() {
    // لا تنفذ polling عند فقدان الشبكة
    if (!this.isOnline) {
      this.scheduleNextPoll(this.backoffDelay());
      return;
    }

    // عند الخلفية: لا polling ولا زيادة لإخفاقات — أجل حتى تصبح الصفحة مرئية
    if (!this.isVisible) {
      this.scheduleNextPoll(this.speedMs);
      return;
    }

    // 🚀 منطق ذكي: تخطي polling إذا كان Socket متصل ولا نحتاج backup
    if (this.isSocketConnected && !this.shouldBackupPoll && !this.backupPollActive) {
      this.scheduleNextPoll(this.speedMs * 2); // polling أبطأ عندما Socket يعمل
      return;
    }

    const roomId = this.cfg.roomId || 'general';
    const url = this.cfg.chatPollUrl.replace(':roomId', encodeURIComponent(roomId));
    const params: Record<string, any> = { limit: 500 };
    if (Number.isFinite(this.lastMessageId) && this.lastMessageId > 0) params.sinceId = this.lastMessageId;

    const startedAt = Date.now();

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.cfg.token) headers['Authorization'] = `Bearer ${this.cfg.token}`;

    fetch(`${url}?${new URLSearchParams(params as any).toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((resp: any) => {
        this.consecutiveFailures = 0;
        const items: Array<any> = Array.isArray(resp?.messages) ? resp.messages : (Array.isArray(resp) ? resp : []);
        this.lastServerLatency = Number(resp?.serverLatency) || 0;
        for (const it of items) {
          if (it && it.id) this.lastMessageId = Math.max(this.lastMessageId, Number(it.id) || 0);
        }
        try {
          window.dispatchEvent(new CustomEvent('chatPollData', { detail: { items } }));
        } catch {}
        this.updateMonitors(startedAt);
        this.scheduleNextPoll(this.speedMs);
      })
      .catch(() => {
        this.consecutiveFailures += 1;
        // Enable backup mode after several consecutive failures — without reloading the page
        if (this.consecutiveFailures >= 3) {
          this.enableBackupMode();
        }
        this.scheduleNextPoll(this.backoffDelay());
      });
  }
}

export function createDefaultConnectionManager(opts: Partial<ConnectionManagerConfig> & { roomId: string }): ConnectionManager {
  return new ConnectionManager({
    chatPollUrl: '/api/messages/room/:roomId/since',
    usersPollUrl: '/api/users/online',
    pingUrl: '/api/ping',
    // errorReportUrl: undefined, // opt-in only if server endpoint implemented
    speedVisibleMs: 1500,
    speedHiddenMs: 4000,
    // تعطيل إعادة التحميل الصلبة بشكل افتراضي
    failuresBeforeHardReload: 0,
    hardReloadOnServerAck: false,
    ...opts,
  });
}
