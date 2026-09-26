import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = 3000;
const url = `http://127.0.0.1:${port}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = path.join(os.tmpdir(), 'vinyl-music-player-local.json');
const APP_MARKER = '<title>Vinyl Music Player';

function requestApp() {
    return new Promise(resolve => {
        const request = http.get(url, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { if (body.length < 8192) body += chunk; });
            response.on('end', () => resolve(response.statusCode === 200 && body.includes(APP_MARKER)));
        });
        request.setTimeout(500, () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}

function portIsBusy() {
    return new Promise(resolve => {
        const request = http.get(url, response => { response.resume(); resolve(true); });
        request.setTimeout(300, () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}

async function waitForAppServer(timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await requestApp()) return true;
        await new Promise(resolve => setTimeout(resolve, 120));
    }
    return false;
}

function openBrowser() {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}

if (!(await requestApp())) {
    if (await portIsBusy()) {
        throw new Error(`${url} is already used by another server. Stop it or use another port before running Vinyl Music Player.`);
    }
    const binary = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'http-server.cmd' : 'http-server');
    if (!existsSync(binary)) throw new Error('Local dependencies are missing. Run npm install once, then run npm run app again.');
    // Local-only: never expose a development server to the LAN by default.
    const server = spawn(binary, ['-a', '127.0.0.1', '-p', String(port), '-c-1'], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
    });
    server.unref();
    if (!(await waitForAppServer())) {
        try { process.kill(server.pid, 'SIGTERM'); } catch {}
        throw new Error('Vinyl Music Player did not become ready on port 3000.');
    }
    writeFileSync(pidFile, JSON.stringify({ pid: server.pid, port, root, startedAt: Date.now() }));
} else if (existsSync(pidFile)) {
    // Never let an old ownership record make app:stop target another process.
    try {
        const saved = JSON.parse(readFileSync(pidFile, 'utf8'));
        if (saved.root !== root || saved.port !== port) rmSync(pidFile, { force: true });
    } catch { rmSync(pidFile, { force: true }); }
}

openBrowser();
console.log(`Vinyl Music Player is ready at ${url}`);
