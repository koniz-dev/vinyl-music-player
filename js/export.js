import { emit, on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { setPlayerPlaying } from './player.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

const EXPORT_TIMEOUT_MS = 5 * 60 * 1000;
const CANVAS_W = 720;
const CANVAS_H = 1280;
const ACCENT_FALLBACK = '#818cf8';
const ACCENT_HI_FALLBACK = '#a5b4fc';

let canvas = null;
let ctx = null;
let recorder = null;
let recordedChunks = [];
let animationId = null;
let timeoutId = null;
let progressInterval = null;
let exportAudio = null;
let audioCtx = null;
let albumArtImage = null;
let exportLyrics = [];
let vinylRotation = 0;
let wasMainAudioPlaying = false;
let exportAccent = ACCENT_FALLBACK;
let exportAccentHi = ACCENT_HI_FALLBACK;

// ──────────────────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────────────────

function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

function readAccentFromCss() {
    const cs = getComputedStyle(document.documentElement);
    exportAccent = cs.getPropertyValue('--accent').trim() || ACCENT_FALLBACK;
    exportAccentHi = cs.getPropertyValue('--accent-hi').trim() || ACCENT_HI_FALLBACK;
}

function pickMimeType() {
    const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
    ];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function disableControls(disabled) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

function cleanup() {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (albumArtImage) { URL.revokeObjectURL(albumArtImage.src); albumArtImage = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    disableControls(false);
    state.isExporting = false;
}

function resumeMainAudioIfPaused() {
    if (!wasMainAudioPlaying || !state.audioElement) return;
    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch(() => {});
}

// ──────────────────────────────────────────────────────────────────
// Recording orchestrator (unchanged from prior version aside from canvas size)
// ──────────────────────────────────────────────────────────────────

async function startVideoRecording({ audioFile, songTitle, artistName, albumArtFile }) {
    if (state.isExporting) return;
    state.isExporting = true;

    wasMainAudioPlaying = !!(state.audioElement && !state.audioElement.paused);
    if (wasMainAudioPlaying) {
        state.audioElement.pause();
        setPlayerPlaying(false);
    }

    disableControls(true);

    try {
        timeoutId = setTimeout(() => {
            cleanup();
            resumeMainAudioIfPaused();
            emit(Events.EXPORT_ERROR, 'Export timeout. Please try again with a shorter audio file.');
        }, EXPORT_TIMEOUT_MS);

        emit(Events.EXPORT_PROGRESS, { progress: 5, message: 'Initializing export…' });

        createCanvas();
        readAccentFromCss();

        if (albumArtFile) {
            emit(Events.EXPORT_PROGRESS, { progress: 15, message: 'Loading album art…' });
            albumArtImage = new Image();
            albumArtImage.src = URL.createObjectURL(albumArtFile);
            await new Promise((resolve) => { albumArtImage.onload = resolve; });
        }

        emit(Events.EXPORT_PROGRESS, { progress: 15, message: 'Loading audio…' });

        const audioUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioUrl);
        exportLyrics = [...state.lyrics];

        await new Promise((resolve, reject) => {
            exportAudio.addEventListener('loadedmetadata', resolve);
            exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        const canvasStream = canvas.captureStream(30);
        const AudioCtxCtor = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtxCtor();
        const source = audioCtx.createMediaElementSource(exportAudio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);

        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
        ]);

        const mimeType = pickMimeType();
        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Setting up recorder…' });

        recorder = new MediaRecorder(combined, { mimeType });
        recordedChunks = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        recorder.onstop = () => {
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

            const videoBlob = new Blob(recordedChunks, { type: mimeType });
            const fileName = `${songTitle.replace(/[<>:"/\\|?*]/g, '')}.webm`;

            emit(Events.EXPORT_PROGRESS, { progress: 100, message: 'Done.' });
            emit(Events.EXPORT_COMPLETE, { videoBlob, fileName });

            if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
            resumeMainAudioIfPaused();
            disableControls(false);
            state.isExporting = false;
        };

        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Recording…' });
        recorder.start();
        exportAudio.play();

        const renderLoop = () => {
            renderToCanvas();
            animationId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        const duration = exportAudio.duration;
        const startTime = performance.now();
        progressInterval = setInterval(() => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(20 + (elapsed / duration) * 60, 80);
            emit(Events.EXPORT_PROGRESS, { progress, message: `Recording… ${Math.round(progress)}%` });
            if (elapsed >= duration) {
                clearInterval(progressInterval);
                progressInterval = null;
                stopRecording();
            }
        }, 100);

    } catch (error) {
        cleanup();
        resumeMainAudioIfPaused();
        emit(Events.EXPORT_ERROR, error.message || 'Unknown error occurred');
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') recorder.stop();
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (albumArtImage) { URL.revokeObjectURL(albumArtImage.src); albumArtImage = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    state.isExporting = false;
}

function cancelExport() {
    if (!state.isExporting) return;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (recorder && recorder.state === 'recording') {
        // Detach onstop so it doesn't fire the COMPLETE event with garbage chunks
        recorder.onstop = null;
        recorder.stop();
    }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (albumArtImage) { URL.revokeObjectURL(albumArtImage.src); albumArtImage = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    disableControls(false);
    state.isExporting = false;
    resumeMainAudioIfPaused();
    emit(Events.EXPORT_CANCELLED);
}

function debugBrowserSupport() {
    const hasMR = !!window.MediaRecorder;
    const checks = [
        ['MediaRecorder API', hasMR],
        ['Canvas 2D',        !!document.createElement('canvas').getContext],
        ['HTMLAudioElement', !!window.Audio],
        ['AudioContext',     !!(window.AudioContext || window.webkitAudioContext)],
        ['WebM',             hasMR && MediaRecorder.isTypeSupported('video/webm')],
        ['WebM + VP8',       hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')],
        ['WebM + VP9',       hasMR && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')],
    ];

    const allOk = checks.every(([, ok]) => ok);
    const webmOk = checks.find(([k]) => k === 'WebM')[1];

    // Always reach the user via toast first. Modal is opt-in via "Details".
    if (allOk) {
        toastSuccess('Your browser supports WebM export.');
        return;
    }

    renderBrowserSupportModal(checks, webmOk);

    const openDetails = () => {
        document.getElementById('browser-support-modal').hidden = false;
    };

    if (webmOk) {
        toastInfo('Some optional features missing — export should still work.', {
            duration: 0,
            action: { label: 'Details', onClick: openDetails },
        });
    } else {
        toastError('WebM export not supported in this browser.', {
            duration: 0,
            action: { label: 'Details', onClick: openDetails },
        });
    }
}

function renderBrowserSupportModal(checks, webmOk) {
    const summary = document.getElementById('bs-summary');
    const list = document.getElementById('bs-list');
    const action = document.getElementById('bs-action');

    summary.innerHTML = `<strong>${navigator.userAgent.split(' ')[0]}</strong> — some features are missing.`;

    list.replaceChildren();
    for (const [label, ok] of checks) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = label;
        const val = document.createElement('span');
        val.className = `support-value ${ok ? 'support-ok' : 'support-fail'}`;
        val.textContent = ok ? '✓ supported' : '✗ missing';
        li.append(name, val);
        list.appendChild(li);
    }

    action.innerHTML = webmOk
        ? 'Some optional checks failed but export may still work — try it.'
        : 'WebM export is not available. Switch to a recent <strong>Chrome</strong>, <strong>Firefox</strong>, or <strong>Edge</strong>.';
}

function bindBrowserSupportModal() {
    const modal = document.getElementById('browser-support-modal');
    const close = () => { modal.hidden = true; };
    document.getElementById('bs-close-btn').addEventListener('click', close);
    document.getElementById('bs-ok-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) close();
    });
}

// ──────────────────────────────────────────────────────────────────
// Render helpers
// ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    return [
        parseInt(h.slice(0, 2), 16) || 0,
        parseInt(h.slice(2, 4), 16) || 0,
        parseInt(h.slice(4, 6), 16) || 0,
    ];
}

function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/* SVG-path icons drawn via Path2D, scaled to fit a 24×24 box. */

function drawSvgPath(pathStr, cx, cy, size, { fill, stroke, strokeWidth = 2 } = {}) {
    const path = new Path2D(pathStr);
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill(path);
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(path);
    }
    ctx.restore();
}

function drawPlayIcon(cx, cy, size, color) {
    drawSvgPath('M6 4 L20 12 L6 20 Z', cx, cy, size, { fill: color });
}

function drawPauseIcon(cx, cy, size, color) {
    drawSvgPath('M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z', cx, cy, size, { fill: color });
}

function drawVolumeIcon(cx, cy, size, color) {
    drawSvgPath(
        'M11 5 L6 9 H2 V15 H6 L11 19 Z M15.54 8.46 a5 5 0 0 1 0 7.07 M19.07 4.93 a10 10 0 0 1 0 14.14',
        cx, cy, size, { stroke: color, strokeWidth: 2 }
    );
}

function drawRepeatIcon(cx, cy, size, color) {
    drawSvgPath(
        'M17 1 L21 5 L17 9 M3 11 V9 a4 4 0 0 1 4-4 h14 M7 23 L3 19 L7 15 M21 13 V15 a4 4 0 0 1-4 4 H3',
        cx, cy, size, { stroke: color, strokeWidth: 2 }
    );
}

// ──────────────────────────────────────────────────────────────────
// Render loop — Studio Dark
// ──────────────────────────────────────────────────────────────────

function renderToCanvas() {
    if (!ctx) return;

    // 1.5°/frame at 30fps = 45°/s = 8s per full rotation (matches CSS `spin 8s linear`)
    vinylRotation = (vinylRotation + 1.5) % 360;

    const W = CANVAS_W;
    const H = CANVAS_H;

    /* ── Background: zinc-950 + accent radial ambient ── */

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    const topGlow = ctx.createRadialGradient(W / 2, -60, 0, W / 2, -60, W * 0.95);
    topGlow.addColorStop(0, rgba(exportAccent, 0.22));
    topGlow.addColorStop(0.65, rgba(exportAccent, 0.04));
    topGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, W, H * 0.7);

    const cornerGlow = ctx.createRadialGradient(W + 40, H + 40, 0, W + 40, H + 40, W * 0.8);
    cornerGlow.addColorStop(0, rgba(exportAccent, 0.16));
    cornerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cornerGlow;
    ctx.fillRect(0, H * 0.35, W, H * 0.65);

    /* ── Brand mark ── */

    ctx.fillStyle = '#fafafa';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // accent dot
    ctx.fillStyle = exportAccent;
    ctx.beginPath();
    ctx.arc(60, 70, 6, 0, Math.PI * 2);
    ctx.fill();
    // wordmark
    ctx.fillStyle = '#fafafa';
    ctx.fillText('vinyl', 78, 70);
    ctx.fillStyle = '#71717a';
    const vinylWidth = ctx.measureText('vinyl').width;
    ctx.fillText('.player', 78 + vinylWidth, 70);

    /* ── Vinyl record ── */

    const vinylSize = 460;
    const vx = W / 2;
    const vy = 380;
    const vr = vinylSize / 2;

    // Outer soft shadow (not rotated)
    const shadow = ctx.createRadialGradient(vx, vy + 14, vr * 0.9, vx, vy + 14, vr * 1.18);
    shadow.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(vx, vy + 14, vr * 1.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate((vinylRotation * Math.PI) / 180);

    // Body
    const body = ctx.createRadialGradient(0, 0, 0, 0, 0, vr);
    body.addColorStop(0, '#1a1a1d');
    body.addColorStop(0.55, '#0c0c0e');
    body.addColorStop(1, '#050506');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, vr, 0, Math.PI * 2);
    ctx.fill();

    // 1px highlight ring at edge
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, vr - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Grooves
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1.5;
    for (const factor of [0.84, 0.70, 0.58]) {
        ctx.beginPath();
        ctx.arc(0, 0, vr * factor, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Center disc (accent gradient)
    const centerR = vr * 0.44;
    const centerGrad = ctx.createLinearGradient(-centerR, -centerR, centerR, centerR);
    centerGrad.addColorStop(0, exportAccent);
    centerGrad.addColorStop(1, exportAccentHi);
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark vignette inside center
    const inner = ctx.createRadialGradient(0, 0, centerR * 0.55, 0, 0, centerR);
    inner.addColorStop(0, 'rgba(0,0,0,0)');
    inner.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();

    // Album art on center
    const artR = centerR * 0.78;
    if (albumArtImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, artR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(albumArtImage, -artR, -artR, artR * 2, artR * 2);
        ctx.restore();
        // soft inner ring
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, artR, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    /* ── Tonearm (not rotated) ── */

    const armStartX = vx + vr * 0.96;
    const armStartY = vy - vr * 0.96;
    const armLen = vr * 0.78;

    ctx.save();
    ctx.translate(armStartX, armStartY);
    ctx.rotate(28 * Math.PI / 180);

    // Arm body
    const armGrad = ctx.createLinearGradient(0, 0, 0, armLen);
    armGrad.addColorStop(0, '#f4f4f5');
    armGrad.addColorStop(1, '#a1a1aa');
    ctx.fillStyle = armGrad;
    ctx.fillRect(-3, 0, 6, armLen);

    // Pivot
    const pivot = ctx.createRadialGradient(-5, -5, 0, 0, 0, 14);
    pivot.addColorStop(0, '#fafafa');
    pivot.addColorStop(1, '#71717a');
    ctx.fillStyle = pivot;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Needle
    ctx.fillStyle = '#27272a';
    ctx.fillRect(-4, armLen - 4, 8, 14);

    ctx.restore();

    /* ── Song title + artist ── */

    const songTitleText = document.querySelector('.vinyl-song-title')?.textContent || 'Untitled';
    const artistText = document.querySelector('.vinyl-artist-name')?.textContent || '';
    const liveLyricsText = document.querySelector('.vinyl-lyrics-text')?.textContent || '';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#fafafa';
    ctx.font = '700 48px Inter, system-ui, sans-serif';
    ctx.fillText(songTitleText, W / 2, 728);

    if (artistText) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '500 22px Inter, system-ui, sans-serif';
        ctx.fillText(artistText, W / 2, 768);
    }

    /* ── Lyrics ── */

    let lyricToShow = '';
    if (exportAudio && exportLyrics.length > 0) {
        const t = exportAudio.currentTime;
        const lyric = exportLyrics.find(l => t >= l.start && t <= l.end);
        if (lyric) lyricToShow = lyric.text;
    } else if (liveLyricsText) {
        lyricToShow = liveLyricsText;
    }

    if (lyricToShow) {
        ctx.fillStyle = state.lyricsColor || exportAccent;
        ctx.font = '600 30px Inter, system-ui, sans-serif';
        ctx.fillText(lyricToShow, W / 2, 836);
    }

    /* ── Progress bar ── */

    const pw = W - 120;
    const px = 60;
    const py = 950;
    const ph = 6;
    const pr = ph / 2;

    ctx.fillStyle = '#27272a';
    roundedRect(px, py, pw, ph, pr);
    ctx.fill();

    let pct = 0;
    if (exportAudio && exportAudio.readyState >= 2 &&
        !isNaN(exportAudio.currentTime) && !isNaN(exportAudio.duration) &&
        exportAudio.duration > 0) {
        pct = Math.min(exportAudio.currentTime / exportAudio.duration, 1);
    }
    const fillW = pw * pct;
    if (fillW > 1) {
        const fillGrad = ctx.createLinearGradient(px, 0, px + fillW, 0);
        fillGrad.addColorStop(0, exportAccent);
        fillGrad.addColorStop(1, exportAccentHi);
        ctx.fillStyle = fillGrad;
        roundedRect(px, py, fillW, ph, pr);
        ctx.fill();
    }

    /* ── Time labels ── */

    ctx.fillStyle = '#71717a';
    ctx.font = '500 18px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    const cur = exportAudio && !isNaN(exportAudio.currentTime) ? exportAudio.currentTime : 0;
    const tot = exportAudio && !isNaN(exportAudio.duration) ? exportAudio.duration : 0;
    ctx.fillText(fmt(cur), px, py + 36);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(tot), px + pw, py + 36);

    /* ── Controls: 3 circles centered ── */

    const btnY = 1110;
    const playSize = 96;
    const sideSize = 68;
    const gap = 28;
    const totalW = sideSize + gap + playSize + gap + sideSize;
    const startX = (W - totalW) / 2;

    // Mute (left)
    const muteCX = startX + sideSize / 2;
    drawCircleBtn(muteCX, btnY, sideSize, '#18181b', 'rgba(255,255,255,0.06)');
    drawVolumeIcon(muteCX, btnY, 26, '#e4e4e7');

    // Play (center, accent + glow)
    const playCX = startX + sideSize + gap + playSize / 2;
    ctx.save();
    ctx.shadowColor = rgba(exportAccent, 0.55);
    ctx.shadowBlur = 36;
    ctx.fillStyle = exportAccent;
    ctx.beginPath();
    ctx.arc(playCX, btnY, playSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (exportAudio && !exportAudio.paused) {
        drawPauseIcon(playCX, btnY, 36, '#09090b');
    } else {
        drawPlayIcon(playCX, btnY, 36, '#09090b');
    }

    // Repeat (right)
    const repCX = startX + sideSize + gap + playSize + gap + sideSize / 2;
    drawCircleBtn(repCX, btnY, sideSize, '#18181b', 'rgba(255,255,255,0.06)');
    drawRepeatIcon(repCX, btnY, 24, '#e4e4e7');
}

function drawCircleBtn(cx, cy, size, fillColor, borderColor) {
    const r = size / 2;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (borderColor) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export function initExport() {
    bindBrowserSupportModal();

    on(Events.EXPORT_REQUESTED, ({ audioFile, songTitle, artistName, albumArtFile }) => {
        if (state.isExporting) return;
        if (!window.MediaRecorder) {
            emit(Events.EXPORT_ERROR,
                'MediaRecorder API is not supported in this browser. Please use Chrome, Firefox, or Edge.');
            return;
        }
        if (songTitle) document.querySelector('.vinyl-song-title').textContent = songTitle;
        if (artistName) document.querySelector('.vinyl-artist-name').textContent = artistName;

        startVideoRecording({ audioFile, songTitle, artistName, albumArtFile });
    });

    on(Events.DEBUG_BROWSER_SUPPORT, debugBrowserSupport);
    on(Events.EXPORT_CANCEL, cancelExport);
}
