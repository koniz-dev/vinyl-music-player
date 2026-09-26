import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = 3000;
const url = `http://127.0.0.1:${port}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = path.join(os.tmpdir(), 'vinyl-music-player-local.pid');

function serverIsRunning() {
    return new Promise(resolve => {
        const request = http.get(url, response => { response.resume(); resolve(true); });
        request.setTimeout(300, () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}

function openBrowser() {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}

if (!(await serverIsRunning())) {
    const binary = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'http-server.cmd' : 'http-server');
    if (!existsSync(binary)) throw new Error('Missing local dependencies. Run npm install once.');
    const server = spawn(binary, ['-p', String(port), '-c-1'], {
        cwd: root,
        detached: true,
        stdio: 'ignore',
    });
    server.unref();
    writeFileSync(pidFile, String(server.pid));
}

openBrowser();
console.log(`Vinyl Music Player is running at ${url}`);
