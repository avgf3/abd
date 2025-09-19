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

// 🔥 تسجيل Service Worker للحفاظ على الاتصال في الخلفية
try {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', async () => {
			try {
				const registration = await navigator.serviceWorker.register('/sw.js');
				console.log('🚀 Service Worker مسجل بنجاح:', registration.scope);
				
				// إرسال رسالة تهيئة للـ Service Worker
				if (registration.active) {
					registration.active.postMessage({
						type: 'init-background-sync',
						data: { serverUrl: window.location.origin }
					});
				}
				
				// الاستماع لرسائل Service Worker
				navigator.serviceWorker.addEventListener('message', (event) => {
					const { type, data } = event.data;
					
					switch (type) {
						case 'background-ping-success':
							console.log('✅ Service Worker: ping نجح في الخلفية');
							break;
						case 'background-ping-failed':
							console.warn('⚠️ Service Worker: ping فشل في الخلفية');
							break;
						case 'background-messages':
							// 🔥 معالجة الرسائل الجديدة من الخلفية
							console.log(`📨 Service Worker: ${data.count} رسالة جديدة في الخلفية`);
							
							// إرسال حدث للواجهة الرئيسية
							window.dispatchEvent(new CustomEvent('backgroundMessagesReceived', {
								detail: {
									messages: data.messages,
									count: data.count,
									timestamp: data.timestamp
								}
							}));
							break;
					}
				});
				
			} catch (error) {
				console.error('❌ فشل تسجيل Service Worker:', error);
			}
		});
	}
} catch {}
