// Versioned cache — bump the suffix on every release to invalidate clients.
const CACHE_VERSION = 'v67';
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
    'js/autosync.js',
    'js/workers/whisper-worker.js',
    'js/album-art.js',
    'js/color-manager.js',
    'js/font-manager.js',
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

/* Workers take their CSP from the script *response* headers — which GitHub
 * Pages can't set — so the SW injects one when serving the Whisper worker.
 * It locks the worker to the pinned CDN + model hosts: even a compromised
 * transformers.js build couldn't exfiltrate the user's audio elsewhere.
 * ('wasm-unsafe-eval' lets ONNX Runtime compile its WebAssembly; *.hf.co
 * covers Hugging Face's Xet/LFS storage redirects.) The very first visit
 * runs before any SW controls the page and is therefore un-wrapped — every
 * later load gets the locked-down worker. */
const WHISPER_WORKER_PATH = '/js/workers/whisper-worker.js';
const WORKER_CSP = [
    "default-src 'none'",
    "script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'",
    'connect-src https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co',
    "worker-src 'self' blob:",
].join('; ');

function withWorkerCsp(response) {
    if (!response || !response.ok) return response;
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', WORKER_CSP);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const isWhisperWorker = url.pathname.endsWith(WHISPER_WORKER_PATH);

    // Stale-while-revalidate: serve cache fast, refresh in background.
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(request);
            const networkPromise = fetch(request)
                .then((response) => {
                    if (response.ok) cache.put(request, response.clone());
                    return response;
                })
                // Offline + not cached: return a proper network-error Response
                // instead of resolving to undefined (which throws in respondWith).
                .catch(() => cached || Response.error());
            const response = await (cached || networkPromise);
            return isWhisperWorker ? withWorkerCsp(response) : response;
        })
    );
});
