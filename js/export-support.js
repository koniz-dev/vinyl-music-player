import { FORMATS } from './lib/state.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

export function debugBrowserSupport() {
    const hasMR = !!window.MediaRecorder;
    const checks = [
        ['MediaRecorder API', hasMR],
        ['Canvas 2D', !!document.createElement('canvas').getContext],
        ['HTMLAudioElement', !!window.Audio],
        ['AudioContext', !!(window.AudioContext || window.webkitAudioContext)],
        ['WebM', hasMR && MediaRecorder.isTypeSupported('video/webm')],
        ['WebM + VP8', hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')],
        ['WebM + VP9', hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')],
        ['MP4 (H.264)', hasMR && FORMATS.mp4.candidates.some(type => MediaRecorder.isTypeSupported(type))],
    ];
    const mp4Ok = checks.find(([label]) => label === 'MP4 (H.264)')[1];
    const allOk = checks.every(([label, ok]) => ok || label === 'MP4 (H.264)');
    const webmOk = checks.find(([label]) => label === 'WebM')[1];

    if (allOk) {
        toastSuccess(mp4Ok
            ? 'Your browser supports MP4 and WebM export.'
            : 'Your browser supports WebM export (MP4 not available).');
        return;
    }

    renderBrowserSupportModal(checks, webmOk);
    const openDetails = () => { document.getElementById('browser-support-modal').hidden = false; };
    const message = webmOk
        ? 'Some optional features missing — export should still work.'
        : 'WebM export not supported in this browser.';
    (webmOk ? toastInfo : toastError)(message, {
        duration: 0,
        action: { label: 'Details', onClick: openDetails },
    });
}

function renderBrowserSupportModal(checks, webmOk) {
    const summary = document.getElementById('bs-summary');
    const list = document.getElementById('bs-list');
    const action = document.getElementById('bs-action');
    summary.innerHTML = `<strong>${navigator.userAgent.split(' ')[0]}</strong> — some features are missing.`;
    list.replaceChildren();
    for (const [label, ok] of checks) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = label;
        const value = document.createElement('span');
        value.className = `support-value ${ok ? 'support-ok' : 'support-fail'}`;
        value.textContent = ok ? '✓ supported' : '✗ missing';
        item.append(name, value);
        list.appendChild(item);
    }
    action.innerHTML = webmOk
        ? 'Some optional checks failed but export may still work — try it.'
        : 'WebM export is not available. Switch to a recent <strong>Chrome</strong>, <strong>Firefox</strong>, or <strong>Edge</strong>.';
}

export function initExportSupportModal() {
    const modal = document.getElementById('browser-support-modal');
    const close = () => { modal.hidden = true; };
    document.getElementById('bs-close-btn').addEventListener('click', close);
    document.getElementById('bs-ok-btn').addEventListener('click', close);
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) close();
    });
}
