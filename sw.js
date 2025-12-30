const GAME_VERSION = 'v0.0.1'; // Incremented version
const CACHE_NAME = `art-${GAME_VERSION}`;

// Added manifest.json to the assets list
const ASSETS = [
    './',
    './index.html',
    './gallery.js',
    './manifest.json' 
];

// 1. INSTALL: Cache files and force activation
self.addEventListener('install', (e) => {
    console.log(`[SW] Installing ${GAME_VERSION}`);
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// 2. ACTIVATE: Delete OLD caches
self.addEventListener('activate', (e) => {
    console.log(`[SW] Activating ${GAME_VERSION}`);
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim(); 
});

// 3. FETCH: Network First, then Update Cache, Fallback to Cache
// This ensures the user ALWAYS has the latest version when online,
// but the offline version stays updated too.
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // IMPORTANT: Clone the response and update the cache 
                // so the "Offline" version is always the latest one seen.
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // If network fails (offline), return the cached version
                return caches.match(e.request);
            })
    );
});
