/* Simple Service Worker for caching static assets and small JSON - Enhanced */
const VERSION = 'v2';
const STATIC_CACHE = `static-${VERSION}`;

self.addEventListener('install', (event) => {
	console.log('🔧 Service Worker installing...');
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('🔧 Service Worker activating...');
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

function isSameOrigin(url) {
	try {
		const u = new URL(url);
		return u.origin === self.location.origin;
	} catch {
		return false;
	}
}

// تحسين معالجة الأحداث لتجنب مشاكل المستمع غير المتزامن
self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET' || !isSameOrigin(req.url)) return;

	const url = new URL(req.url);
	const path = url.pathname || '/';

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
					console.warn('🔧 SW: Cache fetch failed for', path, e);
					return cached || Response.error();
				}
			})
		);
		return;
	}

	// Stale-while-revalidate for small, non-sensitive JSON - محسن
	if (
		path === '/api/rooms' ||
		path.startsWith('/api/notifications/unread-count')
	) {
		event.respondWith(
			caches.open(STATIC_CACHE).then(async (cache) => {
				const cached = await cache.match(req);
				
				// تحسين معالجة الشبكة لتجنب مشاكل المستمع غير المتزامن
				const networkPromise = fetch(req).then((res) => {
					if (res && res.ok) {
						cache.put(req, res.clone());
					}
					return res;
				}).catch((error) => {
					console.warn('🔧 SW: Network fetch failed for', path, error);
					return null;
				});

				// إرجاع البيانات المحفوظة فوراً إذا كانت متوفرة
				if (cached) {
					// تحديث الكاش في الخلفية
					networkPromise.catch(() => {}); // تجاهل الأخطاء في التحديث
					return cached;
				}

				// إذا لم تكن هناك بيانات محفوظة، انتظر الشبكة
				const networkResponse = await networkPromise;
				return networkResponse || Response.error();
			})
		);
		return;
	}
});

// إضافة معالج للأخطاء العامة
self.addEventListener('error', (event) => {
	console.error('🔧 SW: Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
	console.error('🔧 SW: Unhandled promise rejection:', event.reason);
});