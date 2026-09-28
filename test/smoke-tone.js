import { on, Events } from '../js/lib/events.js';

// Manual/automated browser smoke fixture. It is loaded only by `?smoke=1`
// and never in the production workflow. The File is built in memory, so a
// release check never needs a personal audio file or a network request.
function makeToneWav(seconds = 5, sampleRate = 16000) {
    const frames = Math.floor(seconds * sampleRate);
    const dataSize = frames * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const write = (offset, text) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
    write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE');
    write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    write(36, 'data'); view.setUint32(40, dataSize, true);
    for (let i = 0; i < frames; i++) {
        const fade = Math.min(1, i / (sampleRate * 0.03), (frames - i) / (sampleRate * 0.03));
        view.setInt16(44 + i * 2, Math.round(Math.sin(i / sampleRate * Math.PI * 2 * 440) * 0x3800 * fade), true);
    }
    return new File([buffer], 'smoke-tone.wav', { type: 'audio/wav' });
}

export function loadSmokeTone() {
    const input = document.getElementById('audio-file');
    const title = document.getElementById('song-title');
    const rangeEnd = document.getElementById('export-end');
    if (!input || !title || !rangeEnd || typeof DataTransfer === 'undefined') return;
    const requestedSeconds = Number(new URLSearchParams(location.search).get('smoke-seconds'));
    const seconds = Number.isInteger(requestedSeconds) && requestedSeconds >= 5 && requestedSeconds <= 30
        ? requestedSeconds
        : 5;
    const files = new DataTransfer();
    files.items.add(makeToneWav(seconds));
    input.files = files.files;
    title.value = 'smoke-tone';
    rangeEnd.value = `00:${String(seconds).padStart(2, '0')}`;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    title.dispatchEvent(new Event('input', { bubbles: true }));

    const status = document.createElement('output');
    status.id = 'smoke-export-status';
    status.hidden = true;
    status.dataset.status = 'ready';
    document.body.append(status);
    on(Events.EXPORT_COMPLETE, ({ videoBlob, fileName }) => {
        status.dataset.status = 'complete';
        status.dataset.fileName = fileName;
        status.dataset.bytes = String(videoBlob.size);
    });
    on(Events.EXPORT_ERROR, (message) => {
        status.dataset.status = 'error';
        status.dataset.message = String(message);
    });
    on(Events.EXPORT_CANCELLED, () => {
        status.dataset.status = 'cancelled';
    });
}
