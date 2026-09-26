import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

const source = await readFile('./service-worker.js', 'utf8');
const block = source.match(/const PRECACHE = \[([\s\S]*?)\n\];/);
assert.ok(block, 'service worker must declare PRECACHE');

const entries = [...block[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.ok(entries.length > 0, 'PRECACHE must not be empty');
for (const entry of entries) {
    if (entry === './') continue;
    await access(entry.replace(/^\.\//, ''), constants.R_OK);
}

// New local modules are easy to forget when the app has no bundler. Scan all
// production JS for static imports and module-worker URLs, then require every
// same-origin JS dependency to appear in the service-worker precache.
async function jsFiles(dir) {
    const names = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(names.map(async (entry) => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? jsFiles(file) : (entry.name.endsWith('.js') ? [file] : []);
    }));
    return nested.flat();
}

const cached = new Set(entries.map(entry => entry.replace(/^\.\//, '')));
for (const file of await jsFiles('js')) {
    const source = await readFile(file, 'utf8');
    const references = [
        ...source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+\.js)['"]/g),
        ...source.matchAll(/new URL\(['"](\.[^'"]+\.js)['"]/g),
    ];
    for (const reference of references) {
        const target = path.normalize(path.join(path.dirname(file), reference[1]));
        if (target.startsWith('test' + path.sep)) continue;
        assert.ok(cached.has(target), `${target} is imported by ${file} but missing from PRECACHE`);
    }
}
console.log(`PWA precache verified (${entries.length} entries)`);
