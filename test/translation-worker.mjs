import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modelUrl = 'https://huggingface.co/Xenova/nllb-200-distilled-600M/resolve/main/onnx/model.onnx';
const unrelatedUrl = 'https://huggingface.co/Xenova/whisper-tiny/resolve/main/model.onnx';
const deleted = [];
const messages = [];
const cache = {
    async keys() { return [{ url: modelUrl }, { url: unrelatedUrl }]; },
    async delete(request) { deleted.push(request.url); return true; },
};
const originalSelf = globalThis.self;
globalThis.self = {
    caches: { async keys() { return ['transformers-cache']; }, async open() { return cache; } },
    postMessage(message) { messages.push(message); },
};

try {
    const source = await readFile('./js/workers/translate-worker.js', 'utf8');
    await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    await globalThis.self.onmessage({ data: { type: 'remove-model', id: 'remove-test' } });
    assert.deepEqual(deleted, [modelUrl], 'only the NLLB model cache entry is removed');
    assert.deepEqual(messages.at(-1), { type: 'removed', id: 'remove-test', removed: 1 });
} finally {
    globalThis.self = originalSelf;
}

console.log('Translation model removal test passed');
