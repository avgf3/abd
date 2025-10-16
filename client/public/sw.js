/* Enhanced Service Worker for caching static assets and background sync */
const VERSION = 'v3';
const STATIC_CACHE = `static-${VERSION}`;
const BACKGROUND_SYNC_TAG = 'socket-ping-sync';

// متغيرات للـ ping/pong في الخلفية
let pingInterval = null;
let isConnected = false;
let serverUrl = '';

self.addEventListener('install', (event) => {
	console.log('🔧 Service Worker: التثبيت');
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('🚀 Service Worker: التفعيل');
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

// 🔥 Background Sync لدعم ping/pong في الخلفية وأيضاً تفريغ outbox بسيط عبر fetch
self.addEventListener('sync', (event) => {
	console.log('🔄 Service Worker: Background Sync', event.tag);
	
	if (event.tag === BACKGROUND_SYNC_TAG) {
		event.waitUntil(handleBackgroundSync());
	}
});

// معالجة Background Sync
async function handleBackgroundSync() {
	try {
		console.log('📡 Service Worker: إرسال ping للخادم');
		
		// إرسال ping للخادم
		const response = await fetch(`${serverUrl}/api/ping`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		
    if (response.ok) {
			console.log('✅ Service Worker: ping نجح');
			// إشعار التطبيق الرئيسي
			const clients = await self.clients.matchAll();
			clients.forEach(client => {
				client.postMessage({
					type: 'background-ping-success',
					data: { timestamp: Date.now() }
				});
			});
		} else {
			console.warn('⚠️ Service Worker: ping فشل');
		}
	} catch (error) {
		console.error('❌ Service Worker: خطأ في ping:', error);
	}
}

// استقبال الرسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
	const { type, data } = event.data;
	
	switch (type) {
		case 'init-background-sync':
			// تهيئة Background Sync
			serverUrl = data?.serverUrl || self.location.origin;
			console.log('🔧 Service Worker: تهيئة Background Sync', serverUrl);
			break;
			
		case 'start-background-ping':
			// بدء ping في الخلفية
			startBackgroundPing(data?.interval || 60000);
			break;
			
		case 'stop-background-ping':
			// إيقاف ping في الخلفية
			stopBackgroundPing();
			break;
			
		case 'socket-status':
			// تحديث حالة Socket
			isConnected = data?.connected || false;
			break;
	}
});

// بدء ping في الخلفية
function startBackgroundPing(interval = 60000) {
	try {
		stopBackgroundPing();
		
		pingInterval = setInterval(async () => {
			if (isConnected) {
				// تسجيل Background Sync
				try {
					await self.registration.sync.register(BACKGROUND_SYNC_TAG);
					console.log('📡 Service Worker: تسجيل Background Sync');
				} catch (error) {
					console.warn('⚠️ Service Worker: لا يمكن تسجيل Background Sync:', error);
					// fallback إلى ping مباشر
					await handleBackgroundSync();
				}
			}
		}, interval);
		
		console.log(`🚀 Service Worker: بدء ping في الخلفية كل ${interval}ms`);
	} catch (error) {
		console.error('❌ Service Worker: خطأ في بدء ping:', error);
	}
}

// إيقاف ping في الخلفية
function stopBackgroundPing() {
	try {
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
			console.log('⏹️ Service Worker: إيقاف ping في الخلفية');
		}
	} catch (error) {
		console.error('❌ Service Worker: خطأ في إيقاف ping:', error);
	}
}

function isSameOrigin(url) {
	try {
		const u = new URL(url);
		return u.origin === self.location.origin;
	} catch {
		return false;
	}
}

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET' || !isSameOrigin(req.url)) return;

	const url = new URL(req.url);
	const path = url.pathname || '/';

	// Network-first for dynamic counters to avoid stale badge flicker
	if (path.includes('/api/notifications') && path.endsWith('/unread-count')) {
		event.respondWith(
			fetch(req).catch(async () => {
				try {
					const cache = await caches.open(STATIC_CACHE);
					const cached = await cache.match(req);
					return cached || Response.error();
				} catch {
					return Response.error();
				}
			})
		);
		return;
	}

	// Cache-first for hashed assets and svgs
	if (path.startsWith('/assets/') || path.startsWith('/svgs/') || /\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/i.test(path)) {
		event.respondWith(
			caches.open(STATIC_CACHE).then(async (cache) => {
				const cached = await cache.match(req);
				if (cached) return cached;
				try {
					const res = await fetch(req);
					if (res && res.ok) cache.put(req, res.clone());
					return res;
				} catch (e) {
					return cached || Response.error();
				}
			})
		);
		return;
	}

	// Stale-while-revalidate for small, non-sensitive JSON
	if (
		path === '/api/rooms'
	) {
		event.respondWith(
			caches.open(STATIC_CACHE).then(async (cache) => {
				const cached = await cache.match(req);
				const network = fetch(req)
					.then((res) => {
						if (res && res.ok) cache.put(req, res.clone());
						return res;
					})
					.catch(() => cached || Response.error());
				return cached || network;
			})
		);
	}
});