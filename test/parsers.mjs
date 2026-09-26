import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function importModule(path, replacements = {}) {
    let source = await readFile(path, 'utf8');
    for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const formatSource = await readFile('./js/lib/format.js', 'utf8');
const formatUrl = `data:text/javascript;base64,${Buffer.from(formatSource).toString('base64')}`;
const { parseLrc, serializeLrc } = await importModule('./js/lrc.js', { "'./lib/format.js'": JSON.stringify(formatUrl) });

const lines = parseLrc('[00:01.50] First\n[00:03] Second', 5);
assert.deepEqual(lines, [
    { start: '00:01', end: '00:03', text: 'First' },
    { start: '00:03', end: '00:05', text: 'Second' },
]);
assert.equal(serializeLrc(lines), '[00:01] First\n[00:03] Second\n');

const { readId3Metadata } = await importModule('./js/id3.js');
const bytes = (...parts) => new Uint8Array(parts.flatMap(part => Array.from(part)));
const frame = (id, data) => bytes([...id].map(c => c.charCodeAt(0)), [0, 0, 0, data.length], [0, 0], data);
const body = bytes(frame('TIT2', bytes([3], new TextEncoder().encode('Title'))), frame('TPE1', bytes([3], new TextEncoder().encode('Artist'))));
const n = body.length;
const header = bytes([73, 68, 51, 3, 0, 0, (n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127]);
assert.deepEqual(await readId3Metadata(new Blob([header, body])), { title: 'Title', artist: 'Artist' });
console.log('Parser tests passed');
