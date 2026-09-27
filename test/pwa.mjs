import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { constants } from 'node:fs';

const [source, manifestSource] = await Promise.all([
    readFile('./service-worker.js', 'utf8'),
    readFile('./favicon/site.webmanifest', 'utf8'),
]);
const manifest = JSON.parse(manifestSource);
assert.match(source, /Network-first/, 'app shell must prefer fresh network content when online');
assert.ok(!source.includes('cached || networkPromise'), 'app shell must not serve a stale cache before the network');
assert.match(source, /startsWith\('vinyl-music-player-'\)/,
    'activation must delete only older app-shell caches, not ML model caches');
assert.match(source, /event\.data\?\.type === 'SKIP_WAITING'/,
    'a waiting worker must activate only after an explicit update request');
assert.match(source, /const CACHE_VERSION = 'v111'/,
    'the update-flow release must invalidate the previous app shell cache');
const installBlock = source.slice(
    source.indexOf("self.addEventListener('install'"),
    source.indexOf("self.addEventListener('message'")
);
assert.doesNotMatch(installBlock, /skipWaiting/,
    'the install handler must not auto-activate a new worker');
assert.equal(manifest.start_url, '../', 'installed app must launch from the project path, not the site root');
assert.equal(manifest.scope, '../', 'installed app scope must stay within the project path');
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
