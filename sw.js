const GAME_VERSION = 'v0.1.0'; // Incremented to force update
const CACHE_NAME = `art-${GAME_VERSION}`;

// Assets to cache immediately on install
// Ensure these icon files actually exist in your folder!
const ASSETS = [
    './',
    './index.html',
    './gallery.js',
    './tools.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 1. INSTALL: Cache initial assets
self.addEventListener('install', (e) => {
    console.log(`[SW] Installing ${GAME_VERSION}`);
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline assets');
            return cache.addAll(ASSETS);
        }).then(() => {
            return self.skipWaiting(); 
        })
    );
});

// 2. ACTIVATE: Clean up old caches from previous versions
self.addEventListener('activate', (e) => {
    console.log(`[SW] Activating ${GAME_VERSION}`);
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log(`[SW] Removing old cache: ${key}`);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return self.clients.claim();
        })
    );
});

// 3. FETCH: Network-First Strategy
// We try to get the freshest content from the web first.
// If the user is offline, we serve the cached version.
self.addEventListener('fetch', (e) => {
    // Skip non-GET requests (like some analytics or external APIs)
    if (e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // If the network request is successful, update the cache
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If network fails (offline), try to find it in the cache
                return caches.match(e.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If it's a navigation request and not in cache, you could return a fallback page here
                });
            })
    );
});
