// TaskYar Web 2.0 — Production Service Worker
// Cache Version: v2.0.0-rc4
const CACHE_VERSION = 'taskyar-v2.0.0-rc4';
const STATIC_CACHE_NAME = `taskyar-static-${CACHE_VERSION}`;
const SHELL_CACHE_NAME = `taskyar-shell-${CACHE_VERSION}`;

// Pre-cached App Shell & Core Assets
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/register',
  '/manifest.webmanifest',
  '/pwa-icons/icon.svg',
  '/pwa-icons/icon-192.png',
  '/pwa-icons/icon-512.png',
  '/pwa-icons/icon-maskable-192.png',
  '/pwa-icons/icon-maskable-512.png',
  '/pwa-icons/apple-touch-icon.png',
  '/fonts/vazirmatn/vazirmatn.css',
  '/fonts/vazirmatn/Vazirmatn-Regular.woff2',
  '/fonts/vazirmatn/Vazirmatn-Bold.woff2',
  '/fonts/vazirmatn/Vazirmatn-Medium.woff2'
];

// Install: Cache core static assets and shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[SW] Could not precache:', url, err);
          })
        )
      );
    })
  );
  // Auto activate new SW
  self.skipWaiting();
});

// Activate: Clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('taskyar-') && name !== STATIC_CACHE_NAME && name !== SHELL_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Message handler: allow client to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. DO NOT cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. DO NOT cache private API responses (/api/*) in shared public SW cache.
  // Private data persistence is strictly managed by account-scoped IndexedDB.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Navigation requests (HTML documents like /app, /login, /register):
  // Network-first with fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(SHELL_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: return cached /app or match in shell cache
          const cached = await caches.match(request);
          if (cached) return cached;
          const appShell = await caches.match('/app');
          if (appShell) return appShell;
          const loginShell = await caches.match('/login');
          if (loginShell) return loginShell;
          return caches.match('/');
        })
    );
    return;
  }

  // 4. Static assets (Vite build chunks, fonts, icons):
  // Stale-while-revalidate for hashed assets & images
  if (
    url.pathname.startsWith('/build/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/pwa-icons/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, nothing to do if already returned cachedResponse
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Default: Network with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
