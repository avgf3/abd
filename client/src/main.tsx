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

	// تأجيل تحميل socket وتوصيله بعد تهيئة الثيم
	try {
		const mod = await import('@/lib/socket');
		const socket = mod?.getSocket?.();
		if (socket) {
			socket.on('message', (payload: any) => {
				if (payload?.type === 'site_theme_update' && payload?.siteTheme) {
					applyThemeById(payload.siteTheme, false);
					try {
						localStorage.setItem('selectedTheme', payload.siteTheme);
					} catch {}
				}
			});
		}
	} catch {}
})();

createRoot(document.getElementById('root')!).render(<App />);
