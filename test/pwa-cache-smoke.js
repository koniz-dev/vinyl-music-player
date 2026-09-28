// Loaded only by `?pwa-smoke=1`. `only-if-cached` prevents a cache-miss from
// silently falling back to a normal network fetch, giving the release check a
// lightweight proof that the active service worker can supply the app shell.
export async function runPwaCacheSmoke() {
    const output = document.createElement('output');
    output.id = 'pwa-cache-smoke-status';
    output.hidden = true;
    document.body.append(output);
    const paths = [
        'index.html',
        'js/main.js',
        'js/settings.js',
        'js/output-settings.js',
        'js/export-controls.js',
        'js/export.js',
        'js/export-dom.js',
        'js/export-capture.js',
        'js/export-renderer.js',
        'js/export-session.js',
        'js/export-media.js',
        'js/export-support.js',
        'js/media-controls.js',
        'js/translation-controls.js',
        'js/autosync-controls.js',
        'js/lyrics-import-controls.js',
        'js/translate.js',
    ];
    try {
        if (!navigator.serviceWorker?.controller) throw new Error('No active service-worker controller. Reload once after install.');
        const results = await Promise.all(paths.map(async (path) => {
            const response = await fetch(path, { cache: 'only-if-cached', mode: 'same-origin' });
            return response.ok;
        }));
        if (!results.every(Boolean)) throw new Error('A required app-shell asset is not cached.');
        output.dataset.status = 'complete';
        output.dataset.assets = String(paths.length);
    } catch (error) {
        output.dataset.status = 'error';
        output.dataset.message = error?.message || String(error);
    }
}
