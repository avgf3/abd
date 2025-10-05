import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
// import { getSocket } from '@/lib/socket'; // defer dynamic import instead
import { applyThemeById } from '@/utils/applyTheme';
import { apiRequest } from '@/lib/queryClient';

// === Keep page active via muted, looping, silent audio (autoplay-safe) ===
try {
  let keepAliveAudioEl: HTMLAudioElement | null = null;
  let keepAliveUrl: string | null = null;

  const createSilentWavUrl = (seconds = 1, sampleRate = 8000): string => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const numFrames = Math.max(1, Math.floor(seconds * sampleRate));
    const dataSize = numFrames * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM header size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  };

  const ensureKeepAliveAudioPlaying = async (): Promise<boolean> => {
    try {
      if (keepAliveAudioEl && !keepAliveAudioEl.paused) return true;
      if (!keepAliveAudioEl) {
        keepAliveAudioEl = document.createElement('audio');
        keepAliveAudioEl.setAttribute('playsinline', '');
        keepAliveAudioEl.muted = true; // critical for autoplay
        keepAliveAudioEl.loop = true;
        keepAliveAudioEl.preload = 'auto';
        keepAliveAudioEl.style.display = 'none';
        document.documentElement.appendChild(keepAliveAudioEl);
        keepAliveUrl = createSilentWavUrl(1, 8000);
        keepAliveAudioEl.src = keepAliveUrl;

        // Resume when tab returns visible or BFCache restores the page
        document.addEventListener('visibilitychange', () => {
          try {
            if (document.visibilityState === 'visible' && keepAliveAudioEl && keepAliveAudioEl.paused) {
              keepAliveAudioEl.play().catch(() => {});
            }
          } catch {}
        });
        window.addEventListener('pageshow', () => {
          try {
            if (keepAliveAudioEl && keepAliveAudioEl.paused) keepAliveAudioEl.play().catch(() => {});
          } catch {}
        });
      }

      await keepAliveAudioEl.play();
      return true;
    } catch {
      // Autoplay blocked: wait for first gesture
      const onFirstGesture = async () => {
        try { await keepAliveAudioEl?.play(); } finally {
          window.removeEventListener('pointerdown', onFirstGesture as any, { passive: true } as any);
          window.removeEventListener('click', onFirstGesture as any, { passive: true } as any);
          window.removeEventListener('touchstart', onFirstGesture as any, { passive: true } as any);
          window.removeEventListener('keydown', onFirstGesture as any, { passive: true } as any);
        }
      };
      try {
        window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
        window.addEventListener('click', onFirstGesture, { once: true, passive: true });
        window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
        window.addEventListener('keydown', onFirstGesture, { once: true, passive: true });
      } catch {}
      return false;
    }
  };

  // Try to start quickly; if blocked it will arm the gesture fallback
  // Defer a tick to avoid competing with initial layout/paint
  setTimeout(() => { ensureKeepAliveAudioPlaying().catch(() => {}); }, 0);

  // Expose for optional manual triggering elsewhere
  (window as any).ensureKeepAliveAudioPlaying = ensureKeepAliveAudioPlaying;
} catch {}

// تطبيق الثيم المحفوظ عند بدء التطبيق
try {
	const saved = localStorage.getItem('selectedTheme');
	if (saved) applyThemeById(saved, false);
} catch {}

// جلب ثيم الموقع الرسمي وتطبيقه للجميع عند الإقلاع
(async () => {
	try {
		const data = await apiRequest<{ siteTheme: string }>(`/api/settings/site-theme`);
		if ((data as any)?.siteTheme) {
			applyThemeById((data as any).siteTheme, false);
			try { localStorage.setItem('selectedTheme', (data as any).siteTheme); } catch {}
		}
	} catch {}
})();

// الاستماع لتحديثات الثيم فقط (بدون طلب مبكر يحجب الرسم)
(async () => {
	// تأجيل استيراد socket وربط المستمعين فقط عند الخمول لتقليل التكلفة المبكرة
	const scheduleSocketInit = () => {
		try {
			const saveData = (navigator as any)?.connection?.saveData === true;
			if (saveData) return;
			import('@/lib/socket')
				.then((mod) => {
					const socket = mod?.getSocket?.();
					if (!socket) return;
					socket.on('message', (payload: any) => {
						if (payload?.type === 'site_theme_update' && payload?.siteTheme) {
							applyThemeById(payload.siteTheme, false);
							try {
								localStorage.setItem('selectedTheme', payload.siteTheme);
							} catch {}
						}
					});
				})
				.catch(() => {});
		} catch {}
	};
	try {
		if ('requestIdleCallback' in window) {
			(window as any).requestIdleCallback(scheduleSocketInit, { timeout: 3000 });
		} else {
			setTimeout(scheduleSocketInit, 2000);
		}
	} catch {}
})();

createRoot(document.getElementById('root')!).render(<App />);

// Register/cleanup Service Worker (production only, opt-in via VITE_ENABLE_SW)
try {
	if ('serviceWorker' in navigator && !((import.meta as any).env?.DEV)) {
		const enableSw = !!((import.meta as any).env?.VITE_ENABLE_SW);
		window.addEventListener('load', async () => {
			try {
				if (enableSw) {
					await navigator.serviceWorker.register('/sw.js');
				} else {
					const swAny = (navigator as any).serviceWorker;
					const regs = (await swAny?.getRegistrations?.()) || [];
					for (const reg of regs) {
						try { await reg.unregister(); } catch {}
					}
				}
			} catch {}
		});
	}
} catch {}
