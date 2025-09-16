/* Service Worker للعمل الكامل في الخلفية مع الرسائل */
const VERSION = 'v1';
const STATIC_CACHE = `static-${VERSION}`;

self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

// تم إزالة Service Worker messages لتجنب التحديثات المتكررة

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
		path === '/api/rooms' ||
		path.startsWith('/api/notifications/unread-count')
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