import os from 'node:os';
import path from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const pidFile = path.join(os.tmpdir(), 'vinyl-music-player-local.pid');
if (!existsSync(pidFile)) {
    console.log('No background Vinyl Music Player server was started with npm run app.');
    process.exit(0);
}

const pid = Number(readFileSync(pidFile, 'utf8'));
try { process.kill(pid, 'SIGTERM'); } catch {}
rmSync(pidFile, { force: true });
console.log('Stopped the background Vinyl Music Player server.');
