import { emit, on, Events } from './lib/events.js';
import { state, RATIOS } from './lib/state.js';
import { setPlayerPlaying } from './player.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { toCanvas, getFontEmbedCSS } from './vendor/html-to-image.js';
import { icon } from './icons.js';

const EXPORT_TIMEOUT_MS = 5 * 60 * 1000;
const CAPTURE_FPS = 20;                            // less main-thread blocking
const CAPTURE_INTERVAL_MS = 1000 / CAPTURE_FPS;
const PAUSE_ICON_HTML = icon('pause', { size: 24 });

let canvas = null;
let ctx = null;
let recorder = null;
let recordedChunks = [];
let animationId = null;
let timeoutId = null;
let progressInterval = null;
let exportAudio = null;
let audioCtx = null;
let canvasW = 720;
let canvasH = 1280;
let wasMainAudioPlaying = false;
let rendering = false;
let frameEl = null;
let exportLyrics = [];
let liveDomBindings = null;     // {ref to update progress/lyrics in editor}
let visibilityHandler = null;
let backgroundToastDismiss = null;
let lastCaptureTime = 0;
let embeddedFontCss = '';                          // computed once per export, reused per frame

// ──────────────────────────────────────────────────────────────────
// Setup helpers
// ──────────────────────────────────────────────────────────────────

function createCanvas() {
    const dims = RATIOS[state.aspectRatio] || RATIOS['9:16'];
    canvasW = dims.w;
    canvasH = dims.h;
    canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    frameEl = document.querySelector('.frame');
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

function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────────────────────────
// Editor-DOM driving during export
//
// We capture the live `.frame` element each frame. To keep it visually
// "playing" we override a few things directly on the DOM:
//   • force the vinyl spin + tonearm "playing" pose
//   • drive lyrics text, progress bar fill and time labels from exportAudio
//   • mute (not pause) the main audio so the editor's spin state stays running
// All changes are reversed in restoreLiveDom().
// ──────────────────────────────────────────────────────────────────

function snapshotLiveDom() {
    const vinyl = document.getElementById('vinyl');
    const tonearm = document.getElementById('tonearm');
    const frame = document.querySelector('.frame');
    const playBtn = document.querySelector('.vinyl-play-pause-btn');
    const lyricsEl = document.querySelector('.vinyl-lyrics-text');
    const progressEl = document.querySelector('.vinyl-progress');
    const curEl = document.querySelector('.vinyl-current-time');
    const totEl = document.querySelector('.vinyl-total-time');
    return {
        vinyl, tonearm, frame, playBtn, lyricsEl, progressEl, curEl, totEl,
        prevAnimationPlayState: vinyl.style.animationPlayState,
        prevTonearmPlaying: tonearm.classList.contains('playing'),
        prevPlayBtnHtml: playBtn.innerHTML,
        prevLyrics: lyricsEl.textContent,
        prevProgressWidth: progressEl.style.width,
        prevCur: curEl.textContent,
        prevTot: totEl.textContent,
    };
}

function applyLiveExportState(b) {
    b.vinyl.style.animationPlayState = 'running';
    b.tonearm.classList.add('playing');
    // Force the play/pause button into "playing" pose so the captured frame
    // shows a ⏸ (pause) icon — what a viewer expects to see in a running player.
    b.playBtn.innerHTML = PAUSE_ICON_HTML;
    // CSS hook to make all (still-disabled) controls *look* enabled in the capture.
    b.frame.dataset.exporting = 'true';
}

function restoreLiveDom(b) {
    if (!b) return;
    b.vinyl.style.animationPlayState = b.prevAnimationPlayState || (state.isPlaying ? 'running' : 'paused');
    b.tonearm.classList.toggle('playing', b.prevTonearmPlaying);
    b.playBtn.innerHTML = b.prevPlayBtnHtml;
    b.frame.dataset.exporting = 'false';
    b.lyricsEl.textContent = b.prevLyrics;
    b.progressEl.style.width = b.prevProgressWidth;
    b.curEl.textContent = b.prevCur;
    b.totEl.textContent = b.prevTot;
}

function syncLiveDomToExportAudio(b) {
    if (!exportAudio) return;
    const t = exportAudio.currentTime;
    const dur = exportAudio.duration;

    // Lyrics
    const current = exportLyrics.find(l => t >= l.start && t <= l.end);
    const nextLyric = current ? current.text : '';
    if (nextLyric !== b.lyricsEl.textContent) {
        b.lyricsEl.textContent = nextLyric;
    }

    // Progress + time labels
    if (dur > 0) {
        b.progressEl.style.width = `${Math.min(t / dur * 100, 100)}%`;
    }
    b.curEl.textContent = fmt(t);
    b.totEl.textContent = fmt(dur);
}

// ──────────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────────

function cleanup() {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    teardownVisibilityHandler();
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    if (liveDomBindings) { restoreLiveDom(liveDomBindings); liveDomBindings = null; }
    embeddedFontCss = '';
    disableControls(false);
    state.isExporting = false;
    rendering = false;
}

function setupVisibilityHandler() {
    visibilityHandler = () => {
        if (!state.isExporting || !recorder || !exportAudio) return;

        if (document.hidden) {
            // Tab backgrounded — rAF will throttle to ~1Hz. Pause everything so
            // audio + video stay in sync; resume when the user returns.
            try { exportAudio.pause(); } catch {}
            try { if (recorder.state === 'recording') recorder.pause(); } catch {}
            backgroundToastDismiss = toastInfo(
                'Export paused — return to this tab to continue.',
                { duration: 0 }
            );
        } else {
            try { if (recorder.state === 'paused') recorder.resume(); } catch {}
            try { exportAudio.play(); } catch {}
            if (backgroundToastDismiss) {
                backgroundToastDismiss();
                backgroundToastDismiss = null;
            }
        }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
}

function teardownVisibilityHandler() {
    if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        visibilityHandler = null;
    }
    if (backgroundToastDismiss) {
        backgroundToastDismiss();
        backgroundToastDismiss = null;
    }
}

function resumeMainAudioIfPaused() {
    if (!wasMainAudioPlaying || !state.audioElement) return;
    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch(() => {});
}

// ──────────────────────────────────────────────────────────────────
// Per-frame DOM capture
// ──────────────────────────────────────────────────────────────────

async function renderFrame() {
    if (!frameEl || !ctx) return;
    if (liveDomBindings) syncLiveDomToExportAudio(liveDomBindings);

    try {
        const captured = await toCanvas(frameEl, {
            // pixelRatio 1 = capture at the frame's natural CSS size; drawImage
            // then scales up to 720×1280. Halves the DOM-cloning work vs 2x.
            pixelRatio: 1,
            cacheBust: false,
            // Pre-computed once at export start — avoids re-fetching @font-face every frame.
            fontEmbedCSS: embeddedFontCss,
            skipAutoScale: true,
        });
        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.drawImage(captured, 0, 0, canvasW, canvasH);
    } catch {
        // Best-effort: drop this frame, keep recording rolling.
    }
}

function renderLoop(now) {
    if (!state.isExporting) return;
    // Throttle to CAPTURE_FPS so html-to-image doesn't hog the main thread —
    // CSS animations stay smooth in the editor while we record.
    if (!rendering && (now - lastCaptureTime >= CAPTURE_INTERVAL_MS)) {
        lastCaptureTime = now;
        rendering = true;
        renderFrame().finally(() => { rendering = false; });
    }
    animationId = requestAnimationFrame(renderLoop);
}

// ──────────────────────────────────────────────────────────────────
// Recording orchestrator
// ──────────────────────────────────────────────────────────────────

async function startVideoRecording({ audioFile, songTitle, artistName, albumArtFile }) {
    if (state.isExporting) return;
    state.isExporting = true;

    wasMainAudioPlaying = !!(state.audioElement && !state.audioElement.paused);

    // Hard-stop the editor's audio so its timeupdate doesn't fight with our
    // export-driven DOM updates. We force the visual spin back on below via
    // applyLiveExportState() so the recorded frame still shows the record turning.
    if (wasMainAudioPlaying && state.audioElement) {
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

        // Bind to live DOM elements so renderFrame can drive them from exportAudio
        liveDomBindings = snapshotLiveDom();
        applyLiveExportState(liveDomBindings);

        // Pre-fetch + inline @font-face CSS once — heavy work that we DON'T want
        // happening inside every render frame.
        try {
            embeddedFontCss = await getFontEmbedCSS(frameEl);
        } catch {
            embeddedFontCss = '';
        }

        // Album art: nothing to do — html-to-image will capture the live element which
        // already shows the user-uploaded art via theme.js / album-art.js.

        emit(Events.EXPORT_PROGRESS, { progress: 15, message: 'Loading audio…' });

        const audioUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioUrl);
        exportLyrics = [...state.lyrics];

        await new Promise((resolve, reject) => {
            exportAudio.addEventListener('loadedmetadata', resolve);
            exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        const canvasStream = canvas.captureStream(CAPTURE_FPS);
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
            const safeName = (songTitle || '').replace(/[<>:"/\\|?*]/g, '').trim();
            const fileName = (safeName || 'untitled') + '.webm';

            emit(Events.EXPORT_PROGRESS, { progress: 100, message: 'Done.' });
            emit(Events.EXPORT_COMPLETE, { videoBlob, fileName });

            teardownVisibilityHandler();
            if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
            if (liveDomBindings) { restoreLiveDom(liveDomBindings); liveDomBindings = null; }
            resumeMainAudioIfPaused();
            disableControls(false);
            state.isExporting = false;
            rendering = false;
        };

        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Recording…' });
        recorder.start();
        exportAudio.play();

        // Pause render + recorder if the user switches tabs; resume when they return.
        setupVisibilityHandler();

        lastCaptureTime = 0;
        animationId = requestAnimationFrame(renderLoop);

        // Drive progress off exportAudio.currentTime so it auto-pauses
        // when the user backgrounds the tab.
        const duration = exportAudio.duration;
        progressInterval = setInterval(() => {
            if (!exportAudio || exportAudio.paused) return;
            const elapsed = exportAudio.currentTime;
            const progress = Math.min(20 + (elapsed / duration) * 60, 80);
            emit(Events.EXPORT_PROGRESS, { progress, message: `Recording… ${Math.round(progress)}%` });
            if (elapsed >= duration - 0.05) {
                clearInterval(progressInterval);
                progressInterval = null;
                stopRecording();
            }
        }, 200);

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
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    state.isExporting = false;
    rendering = false;
}

function cancelExport() {
    if (!state.isExporting) return;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    teardownVisibilityHandler();
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        recorder.onstop = null;
        recorder.stop();
    }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    if (liveDomBindings) { restoreLiveDom(liveDomBindings); liveDomBindings = null; }
    disableControls(false);
    state.isExporting = false;
    rendering = false;
    resumeMainAudioIfPaused();
    emit(Events.EXPORT_CANCELLED);
}

// ──────────────────────────────────────────────────────────────────
// Browser support modal (unchanged from previous version)
// ──────────────────────────────────────────────────────────────────

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
