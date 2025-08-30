import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
// import { getSocket } from '@/lib/socket'; // defer dynamic import instead
import { applyThemeById } from '@/utils/applyTheme';
import { initPerfMonitoring } from '@/lib/perf';

// تطبيق الثيم المحفوظ عند بدء التطبيق
try {
	const saved = localStorage.getItem('selectedTheme');
	if (saved) applyThemeById(saved, false);
} catch {}

// جلب ثيم الموقع العام وتطبيقه ثم الاستماع لتحديثاته
(async () => {
	try {
		const res = await fetch('/api/settings/site-theme', { credentials: 'include' });
		if (res.ok) {
			const data = await res.json();
			if (data?.siteTheme) {
				applyThemeById(data.siteTheme, false);
			}
		}
	} catch {}

	// تأجيل استيراد socket وربط المستمعين فقط عند الخمول لتقليل التكلفة المبكرة
	const scheduleSocketInit = () => {
		try {
			const saveData = (navigator as any)?.connection?.saveData === true;
			if (saveData) return;
			import('@/lib/socket')
				.then((mod) => {
					const socket = mod?.getSocket?.();
					if (!socket) return;
					performance.mark?.('socket:ready');
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

try {
	performance.mark?.('app:start');
	initPerfMonitoring();
} catch {}

createRoot(document.getElementById('root')!).render(<App />);

try {
	performance.mark?.('app:afterRender');
	performance.measure?.('app:render', 'app:start', 'app:afterRender');
} catch {}

// Register Service Worker (production only)
try {
	if ('serviceWorker' in navigator && !((import.meta as any).env?.DEV)) {
		window.addEventListener('load', () => {
			navigator.serviceWorker
				.register('/sw.js')
				.catch(() => {});
		});
	}
} catch {}
