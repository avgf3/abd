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

// 🔥 إضافة معالجة الرسائل في الخلفية
self.addEventListener('message', event => {
  if (event.data.type === 'KEEP_ALIVE') {
    // ✅ الحفاظ على الاتصال في الخلفية
    event.waitUntil(keepConnectionAlive());
  }
  
  if (event.data.type === 'BACKGROUND_SYNC') {
    // ✅ مزامنة الرسائل في الخلفية
    event.waitUntil(syncMessagesInBackground());
  }
});

// 🔥 الحفاظ على الاتصال في الخلفية
const keepConnectionAlive = async () => {
  console.log('🔄 بدء الحفاظ على الاتصال في الخلفية');
  
  // إرسال ping دوري للخادم
  const pingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/ping', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          timestamp: Date.now(),
          source: 'service-worker'
        })
      });
      
      if (response.ok) {
        console.log('✅ Ping ناجح من الخلفية');
      }
    } catch (error) {
      console.log('❌ فشل في إرسال ping من الخلفية:', error);
    }
  }, 300000); // إصلاح: كل 5 دقائق بدلاً من 30 ثانية لتقليل الحمل
  
  // إيقاف Ping بعد 10 دقائق لتوفير البطارية
  setTimeout(() => {
    clearInterval(pingInterval);
    console.log('⏹️ توقف Ping في الخلفية');
  }, 600000); // 10 دقائق
};

// 🔥 مزامنة الرسائل في الخلفية
const syncMessagesInBackground = async () => {
  console.log('📨 بدء مزامنة الرسائل في الخلفية');
  
  try {
    // جلب الرسائل الجديدة
    const response = await fetch('/api/messages/latest', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const messages = await response.json();
      
      // إرسال الرسائل للصفحة المفتوحة
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'NEW_MESSAGES',
          messages: messages
        });
      });
      
      console.log(`📨 تم مزامنة ${messages.length} رسالة في الخلفية`);
    }
  } catch (error) {
    console.log('❌ فشل في مزامنة الرسائل:', error);
  }
};

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