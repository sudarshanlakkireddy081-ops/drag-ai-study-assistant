/* ==============================================================================
   DrAG Service Worker
   - Essential application assets precaching
   - Network-First with Cache fallback for /api/documents & /api/documents/:id
   - Offline reading mode for previously loaded documents & textbook pages
   - Offline navigation fallback to cached SPA shell
   ============================================================================== */

const STATIC_CACHE_NAME = 'drag-static-v1';
const DOCS_CACHE_NAME = 'drag-documents-v1';

// Essential static shell assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

// Install Event: Precache essential assets and take control
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some assets failed to precache:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, DOCS_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[ServiceWorker] Removing legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Intelligent routing based on request type
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-http(s) or browser extension requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation Requests (Page reloads, deep links): Network-First, fallback to cached SPA shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline navigation fallback: serve cached index.html or root
          const cachedIndex = await caches.match('/index.html') || await caches.match('/');
          if (cachedIndex) {
            return cachedIndex;
          }
          return new Response(
            '<!DOCTYPE html><html><body><h1>DrAG Offline</h1><p>Application shell is cached. Please reload once online.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 2. Document Data API (/api/documents & /api/documents/:id)
  // Strategy: Network-First with Cache fallback.
  // When online: fetch fresh data & update cache.
  // When offline: serve cached documents so user can read previously loaded documents!
  if (url.pathname === '/api/documents' || url.pathname.startsWith('/api/documents/')) {
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(DOCS_CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(async (error) => {
            console.log('[ServiceWorker] Network unavailable for document API, falling back to cache:', url.pathname);
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              // Append header to let client know response came from offline cache
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-DrAG-Offline-Cache', 'true');
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers,
              });
            }

            // Return friendly offline JSON fallback if not yet in cache
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Document was not cached for offline viewing.',
                offline: true,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'X-DrAG-Offline-Cache': 'true' },
              }
            );
          })
      );
      return;
    }
  }

  // 3. Static Assets: JS bundles, CSS, Google Fonts, SVGs, images
  // Strategy: Cache-First with Network background refresh (Stale-While-Revalidate)
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff|woff2|ttf|eot|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/assets/');

  if (isStaticAsset && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch fresh copy in the background
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => null);

        // If in cache, return immediately (fastest latency)
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, await network
        return networkFetch.then((res) => {
          if (res) return res;
          // Fallback empty response
          return new Response('', { status: 408, statusText: 'Request timed out or offline' });
        });
      })
    );
    return;
  }

  // 4. Default fetch handler for other requests (e.g. non-cached APIs like chat)
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This feature requires an active network connection.',
          offline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    })
  );
});

// Message Event: Listen for skipWaiting command from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
