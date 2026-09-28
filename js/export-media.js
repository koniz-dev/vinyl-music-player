import { FORMATS } from './lib/state.js';

export function pickExportMimeType(videoFormat) {
    const format = FORMATS[videoFormat] || FORMATS.webm;
    const candidates = [...format.candidates, ...FORMATS.webm.candidates];
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
}
