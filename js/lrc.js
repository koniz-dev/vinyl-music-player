import { formatTime } from './lib/format.js';

const STAMP = /\[(\d+):(\d{2})(?:\.(\d{1,3}))?\]/g;

export function parseLrc(source, duration = 0) {
    const lines = [];
    for (const raw of String(source).split(/\r?\n/)) {
        const text = raw.replace(STAMP, '').trim();
        const stamps = [...raw.matchAll(STAMP)];
        for (const stamp of stamps) {
            const seconds = Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || 0}`);
            if (text) lines.push({ startSeconds: seconds, text });
        }
    }
    lines.sort((a, b) => a.startSeconds - b.startSeconds);
    return lines.map((line, i) => ({
        start: formatTime(line.startSeconds),
        end: formatTime(i + 1 < lines.length ? lines[i + 1].startSeconds : Math.max(line.startSeconds + 1, duration)),
        text: line.text,
    }));
}

export function serializeLrc(lines) {
    return lines.map(({ start, text }) => `[${start}] ${text}`).join('\n') + (lines.length ? '\n' : '');
}
