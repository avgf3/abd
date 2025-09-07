import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
// import { getSocket } from '@/lib/socket'; // defer dynamic import instead
import { applyThemeById } from '@/utils/applyTheme';

// تطبيق الثيم المحفوظ عند بدء التطبيق
try {
	const saved = localStorage.getItem('selectedTheme');
	if (saved) applyThemeById(saved, false);
} catch {}

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
