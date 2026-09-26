import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const pidFile = path.join(os.tmpdir(), 'vinyl-music-player-local.json');
const APP_MARKER = '<title>Vinyl Music Player';

function requestApp(port) {
    return new Promise(resolve => {
        const request = http.get(`http://127.0.0.1:${port}`, response => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => { if (body.length < 8192) body += chunk; });
            response.on('end', () => resolve(response.statusCode === 200 && body.includes(APP_MARKER)));
        });
        request.setTimeout(500, () => { request.destroy(); resolve(false); });
        request.on('error', () => resolve(false));
    });
}
if (!existsSync(pidFile)) {
    console.log('No background Vinyl Music Player server was started with npm run app.');
    process.exit(0);
}

let saved;
try {
    saved = JSON.parse(readFileSync(pidFile, 'utf8'));
    if (!Number.isInteger(saved.pid) || !saved.root || saved.port !== 3000) throw new Error('Invalid launcher record');
} catch {
    rmSync(pidFile, { force: true });
    console.log('Removed an invalid or stale Vinyl Music Player launcher record.');
    process.exit(0);
}

let command = '';
try {
    process.kill(saved.pid, 0);
    command = execFileSync('ps', ['-p', String(saved.pid), '-o', 'command='], { encoding: 'utf8' });
} catch {
    rmSync(pidFile, { force: true });
    console.log('Removed a stale Vinyl Music Player launcher record.');
    process.exit(0);
}

if (!command.includes('http-server') || !(await requestApp(saved.port))) {
    rmSync(pidFile, { force: true });
    console.log('Refused to stop a process that is not the recorded Vinyl Music Player server.');
    process.exit(0);
}

process.kill(saved.pid, 'SIGTERM');
rmSync(pidFile, { force: true });
console.log('Stopped the background Vinyl Music Player server.');
