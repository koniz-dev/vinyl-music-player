// Lazy, on-device NLLB translation. The model is fetched from the Hugging
// Face Hub only when the user presses Translate; lyric text never leaves this
// worker/browser. NLLB avoids the unreliable Marian tokenizer path for vi/en.
const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const MODEL = 'Xenova/nllb-200-distilled-600M';
const DIRECTIONS = Object.freeze({
    'en-vi': { src_lang: 'eng_Latn', tgt_lang: 'vie_Latn' },
    'vi-en': { src_lang: 'vie_Latn', tgt_lang: 'eng_Latn' },
});
let pipelinePromise = null;

function hasUsableText(value) {
    return typeof value === 'string' && (value.match(/[\p{L}\p{N}]/gu) || []).length >= 2;
}

async function getTranslator(id) {
    if (pipelinePromise) return pipelinePromise;
    const pending = (async () => {
        const { pipeline, env } = await import(CDN);
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline('translation', MODEL, {
            progress_callback: (progress) => {
                if (progress.status === 'progress' && progress.total) {
                    self.postMessage({ type: 'progress', id, stage: 'download' });
                }
            },
        });
    })();
    pipelinePromise = pending;
    try { return await pending; } catch (error) { pipelinePromise = null; throw error; }
}

async function removeCachedModel() {
    const cacheStorage = self.caches;
    if (!cacheStorage) return 0;
    let removed = 0;
    const directNeedle = MODEL.toLowerCase();
    const encodedNeedle = encodeURIComponent(MODEL).toLowerCase();
    for (const name of await cacheStorage.keys()) {
        const cache = await cacheStorage.open(name);
        for (const request of await cache.keys()) {
            const url = request.url.toLowerCase();
            if ((url.includes(directNeedle) || url.includes(encodedNeedle)) && await cache.delete(request)) removed++;
        }
    }
    return removed;
}

self.onmessage = async (event) => {
    const { type, id, lines, direction } = event.data || {};
    if (type === 'remove-model') {
        try {
            pipelinePromise = null;
            self.postMessage({ type: 'progress', id, stage: 'removing' });
            self.postMessage({ type: 'removed', id, removed: await removeCachedModel() });
        } catch (error) {
            self.postMessage({ type: 'error', id, message: error?.message || String(error) });
        }
        return;
    }
    if (type !== 'translate' || !DIRECTIONS[direction] || !Array.isArray(lines)) return;
    try {
        self.postMessage({ type: 'progress', id, stage: 'init' });
        const translator = await getTranslator(id);
        self.postMessage({ type: 'progress', id, stage: 'translate' });
        const output = await translator(lines, { ...DIRECTIONS[direction], max_new_tokens: 128 });
        const translations = output.map(row => row?.translation_text || '');
        if (translations.length !== lines.length || translations.some(value => !hasUsableText(value))) {
            throw new Error('The translation model returned unusable text. Please try again later.');
        }
        self.postMessage({ type: 'result', id, translations });
    } catch (error) {
        self.postMessage({ type: 'error', id, message: error?.message || String(error) });
    }
};
