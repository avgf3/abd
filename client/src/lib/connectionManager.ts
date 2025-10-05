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
  failuresBeforeHardReload?: number;
  hardReloadOnServerAck?: boolean;
};

export class ConnectionManager {
  private isOnline = navigator.onLine;
  private isVisible = document.visibilityState !== 'hidden';
  private pollTimerId: number | null = null;
  private lastMessageId = 0;
  private consecutiveFailures = 0;
  private speedMs: number;
  private lastServerLatency = 0;

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

    window.addEventListener('pageshow', () => this.scheduleNextPoll(1));

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

    window.addEventListener('error', (event: ErrorEvent) => {
      const url = this.cfg.errorReportUrl; // only post if explicitly configured
      if (!url) return;
      try {
        const message = `${event?.error?.message || event?.message || 'Unknown error'}\n${event?.error?.stack || ''}`;
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ e: message }).toString(),
          keepalive: true,
        })
          .then((r) => r.text())
          .then((txt) => {
            if ((this.cfg.hardReloadOnServerAck ?? true) && String(txt).trim() === '1') this.hardReload();
          })
          .catch(() => {});
      } catch {}
    });

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
  }

  public forceReload() {
    this.hardReload();
  }

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

  private hardReload() {
    try { window.location.reload(true); } catch { window.location.reload(); }
  }

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
    if (!this.isOnline) {
      this.scheduleNextPoll(this.backoffDelay());
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
        const reloadLimit = this.cfg.failuresBeforeHardReload;
        if (typeof reloadLimit === 'number' && reloadLimit > 0 && this.consecutiveFailures >= reloadLimit) {
          this.hardReload();
          return;
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
    failuresBeforeHardReload: 25,
    hardReloadOnServerAck: true,
    ...opts,
  });
}
