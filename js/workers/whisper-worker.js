/**
 * Whisper transcription worker (module worker).
 *
 * Runs OpenAI Whisper tiny (multilingual) fully in the browser via
 * transformers.js + ONNX Runtime. Everything is lazy: the library loads from
 * jsDelivr and the model weights (~40 MB quantized) stream from the Hugging
 * Face Hub on first use. transformers.js stores the weights in the browser's
 * Cache API, so later runs skip the download and work offline.
 *
 * Kept off the main thread so a multi-minute transcription never janks the
 * playing vinyl UI.
 *
 * Protocol:
 *   in  → { type: 'transcribe', audio: Float32Array (16 kHz mono),
 *           timestamps: 'word'|'segment', language: string|null }
 *   out ← { type: 'progress', stage: 'download', file, loaded, total }
 *       ← { type: 'progress', stage: 'init' }
 *       ← { type: 'progress', stage: 'transcribe' }
 *       ← { type: 'result', chunks: [{ text, timestamp: [start, end] }], wordLevel }
 *       ← { type: 'error', message }
 */

// Pinned: v4 changed APIs; 3.8.1 is the last v3 release.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const MODEL_ID = 'onnx-community/whisper-tiny';

// transformers.js and ONNX Runtime log benign internals (chunked downloads
// without content-length, Windows powerPreference, shape ops assigned to
// CPU, the English-default notice we handle ourselves via detectLanguage)
// that read like errors in the console. Silence the known-noise patterns;
// everything else still gets through.
const CONSOLE_NOISE = [
    'Unable to determine content-length',
    'powerPreference option is currently ignored',
    'Some nodes were not assigned to the preferred execution providers',
    'Rerunning with verbose output',
    'No language specified - defaulting to English',
];
for (const method of ['warn', 'error', 'log']) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
        try {
            const text = String(args[0] ?? '');
            if (CONSOLE_NOISE.some(noise => text.includes(noise))) return;
        } catch {
            // An exotic first arg (throwing toString) must never break the
            // library code that called console — fall through and log it.
        }
        original(...args);
    };
}

let asrPromise = null;

function getPipeline() {
    if (asrPromise) return asrPromise;

    asrPromise = (async () => {
        const { pipeline, env } = await import(TRANSFORMERS_CDN);
        // Never probe our own origin for model files — weights live on the Hub.
        env.allowLocalModels = false;

        // The library fires a callback per network chunk — hundreds/sec on a
        // fast connection. Only forward whole-percent changes per file so the
        // main thread isn't flooded with postMessage + DOM updates.
        const lastPercent = new Map();
        const progress_callback = (p) => {
            if (p.status !== 'progress' || !p.total) return;
            const percent = Math.floor((p.loaded / p.total) * 100);
            if (lastPercent.get(p.file) === percent) return;
            lastPercent.set(p.file, percent);
            self.postMessage({
                type: 'progress', stage: 'download',
                file: p.file, loaded: p.loaded, total: p.total,
            });
        };

        // WebGPU when available (fp32 encoder + q4 decoder is the proven
        // combo for Whisper on WebGPU); plain quantized WASM otherwise.
        // navigator.gpu existing isn't enough — headless and blocklisted
        // GPUs expose the API but refuse to hand out an adapter, and a
        // failed webgpu init poisons ONNX Runtime for the whole worker.
        // Probe for a real adapter before committing.
        let hasWebGPU = false;
        try {
            hasWebGPU = !!(self.navigator?.gpu && await self.navigator.gpu.requestAdapter());
        } catch {
            // No adapter — stick with WASM.
        }
        const attempts = hasWebGPU
            ? [
                { device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' } },
                { device: 'wasm', dtype: 'q8' },
            ]
            : [{ device: 'wasm', dtype: 'q8' }];

        let lastError = null;
        for (const opts of attempts) {
            try {
                const asr = await pipeline('automatic-speech-recognition', MODEL_ID, {
                    ...opts,
                    progress_callback,
                });
                self.postMessage({ type: 'progress', stage: 'init' });
                return asr;
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    })();

    // A failed init must not poison future runs (e.g. flaky network).
    asrPromise.catch(() => { asrPromise = null; });
    return asrPromise;
}

self.onmessage = async (event) => {
    const { type, audio, timestamps, language } = event.data || {};
    if (type !== 'transcribe') return;

    try {
        const asr = await getPipeline();
        self.postMessage({ type: 'progress', stage: 'transcribe' });

        // >30s audio needs chunking; the 5s stride lets Whisper stitch
        // sentences across chunk borders. transformers.js can't auto-detect
        // the language (it silently assumes English), so the caller guesses
        // one from the user's lyrics/title and we forward it when present.
        const base = { chunk_length_s: 30, stride_length_s: 5 };
        if (language) base.language = language;

        let chunks;
        let wordLevel = timestamps === 'word';
        if (wordLevel) {
            try {
                const out = await asr(audio, { ...base, return_timestamps: 'word' });
                chunks = out.chunks || [];
            } catch {
                // Word-level needs alignment heads in the model config —
                // fall back to segment timestamps if they're unavailable.
                wordLevel = false;
            }
        }
        if (!chunks) {
            const out = await asr(audio, { ...base, return_timestamps: true });
            chunks = out.chunks || [];
        }

        self.postMessage({ type: 'result', chunks, wordLevel });
    } catch (err) {
        self.postMessage({ type: 'error', message: err?.message || String(err) });
    }
};
