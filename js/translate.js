let worker = null;
let requestId = 0;
const REQUEST_TIMEOUT_MS = 180_000;
// Hugging Face documents the browser NLLB model as larger than 1 GB. Leave
// headroom for the browser cache and ONNX runtime before starting a download.
export const TRANSLATION_MODEL_MIN_FREE_BYTES = 1_200_000_000;

function getWorker() {
    if (!worker) worker = new Worker(new URL('./workers/translate-worker.js', import.meta.url), { type: 'module' });
    return worker;
}

function discardWorker() {
    worker?.terminate();
    worker = null;
}

/** Translate a batch of lyric lines locally. No lyric text leaves the browser. */
export function translateLyrics(lines, direction, onProgress) {
    const id = ++requestId;
    return new Promise((resolve, reject) => {
        const w = getWorker();
        const timeout = setTimeout(() => {
            cleanup();
            // A worker can remain busy in ONNX/WASM after a stalled request.
            // Terminating it makes a later retry start from a clean state.
            discardWorker();
            reject(new Error('Translation timed out. Check your connection and try again.'));
        }, REQUEST_TIMEOUT_MS);
        const cleanup = () => {
            clearTimeout(timeout);
            w.onmessage = null;
            w.onerror = null;
        };
        w.onmessage = (event) => {
            const message = event.data || {};
            if (message.id !== id) return;
            if (message.type === 'progress') return onProgress?.(message.stage);
            cleanup();
            if (message.type === 'result') resolve(message.translations || []);
            else reject(new Error(message.message || 'Translation failed.'));
        };
        w.onerror = (event) => { cleanup(); reject(new Error(event.message || 'Translation worker failed to load.')); };
        w.postMessage({ type: 'translate', id, lines, direction });
    });
}

export async function getTranslationStorageEstimate() {
    if (!navigator.storage?.estimate) return null;
    try {
        const { quota, usage } = await navigator.storage.estimate();
        if (!Number.isFinite(quota) || !Number.isFinite(usage)) return null;
        return { quota, usage, available: Math.max(0, quota - usage) };
    } catch {
        return null;
    }
}

/** Remove only cached NLLB assets, never music, lyrics, or app settings. */
export function removeTranslationModel(onProgress) {
    const id = ++requestId;
    return new Promise((resolve, reject) => {
        const w = getWorker();
        const cleanup = () => { w.onmessage = null; w.onerror = null; };
        w.onmessage = (event) => {
            const message = event.data || {};
            if (message.id !== id) return;
            if (message.type === 'progress') return onProgress?.(message.stage);
            cleanup();
            discardWorker();
            if (message.type === 'removed') resolve(message.removed || 0);
            else reject(new Error(message.message || 'Could not remove the translation model.'));
        };
        w.onerror = (event) => { cleanup(); discardWorker(); reject(new Error(event.message || 'Translation worker failed to load.')); };
        w.postMessage({ type: 'remove-model', id });
    });
}
