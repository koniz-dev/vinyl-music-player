// Versioned cache — bump the suffix on every release to invalidate clients.
const CACHE_VERSION = 'v34';
const CACHE_NAME = `vinyl-music-player-${CACHE_VERSION}`;

const PRECACHE = [
    './',
    'index.html',
    'styles/common.css',
    'styles/index.css',
    'styles/settings.css',
    'styles/vinyl-player.css',
    'styles/toast.css',
    'js/main.js',
    'js/player.js',
    'js/settings.js',
    'js/export.js',
    'js/album-art.js',
    'js/color-manager.js',
    'js/theme.js',
    'js/drawer.js',
    'js/toast.js',
    'js/icons.js',
    'js/vendor/html-to-image.js',
    'js/vendor/html-to-image.umd.js',
    'js/lib/events.js',
    'js/lib/state.js',
    'js/lib/format.js',
    'favicon/icon.svg',
    'favicon/favicon.ico',
    'favicon/favicon-16x16.png',
    'favicon/favicon-32x32.png',
    'favicon/apple-touch-icon.png',
    'favicon/android-chrome-192x192.png',
    'favicon/android-chrome-512x512.png',
    'favicon/site.webmanifest',
];

self.addEventListener('install', (event) => {
    // Cache items individually so one 404 doesn't reject the whole install.
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(PRECACHE.map(async (url) => {
            try {
                const response = await fetch(url, { cache: 'reload' });
                if (response.ok) await cache.put(url, response);
            } catch {
                // Skip missing assets — SW still installs.
            }
        }));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // Stale-while-revalidate: serve cache fast, refresh in background.
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const networkPromise = fetch(request)
                .then((response) => {
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                })
                .catch(() => cached);
            return cached || networkPromise;
        })
    );
});
