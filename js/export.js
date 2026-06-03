import { emit, on, Events } from './lib/events.js';
import { state, RATIOS } from './lib/state.js';
import { setPlayerPlaying } from './player.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { toCanvas } from './vendor/html-to-image.js';
import { icon } from './icons.js';

const EXPORT_TIMEOUT_MS = 5 * 60 * 1000;
// Video at 30fps. Canvas updates at rAF (~60fps) so the video stream always
// has a fresh frame to sample. Vinyl rotation is computed every frame; the
// expensive html-to-image work only fires at setup + every BASE_REFRESH_MS.
const OUTPUT_FPS = 30;
const BASE_REFRESH_MS = 1000;
const VINYL_SPIN_PERIOD_S = 8;       // matches CSS `spin 8s linear infinite`
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
let cachedBase = null;            // html-to-image: frame minus vinyl/tonearm/sheen
let cachedVinyl = null;           // html-to-image: vinyl-record at angle 0
let cachedSheen = null;           // html-to-image: vinyl-sheen overlay
let cachedTonearm = null;         // html-to-image: tonearm SVG, playing pose
let vinylRect = null;             // bounding box on the export canvas (px)
let sheenRect = null;
let tonearmRect = null;
let canvasScale = 1;              // canvas-px per CSS-px (for shadow blur scaling)
let baseCapturePending = false;
let lastBaseCapturedAt = 0;

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
        prevAnimation: vinyl.style.animation,
        prevAnimationPlayState: vinyl.style.animationPlayState,
        prevTransform: vinyl.style.transform,
        prevTonearmTransform: tonearm.style.transform,
        prevTonearmPlaying: tonearm.classList.contains('playing'),
        prevPlayBtnHtml: playBtn.innerHTML,
        prevLyrics: lyricsEl.textContent,
        prevProgressWidth: progressEl.style.width,
        prevCur: curEl.textContent,
        prevTot: totEl.textContent,
    };
}

function applyLiveExportState(b) {
    // Restart vinyl spin from angle 0 — the export video begins at audio t=0,
    // so the editor should visually mirror that. Toggle animation-name off/on
    // (with a reflow in between) to reset the CSS animation timeline.
    b.vinyl.style.animationName = 'none';
    void b.vinyl.offsetHeight;     // force reflow so the browser commits 'none'
    b.vinyl.style.animationName = '';   // CSS rule's `spin` re-applies from t=0
    b.vinyl.style.animationPlayState = 'running';

    b.tonearm.classList.add('playing');
    b.playBtn.innerHTML = PAUSE_ICON_HTML;
    b.frame.dataset.exporting = 'true';
}

function restoreLiveDom(b) {
    if (!b) return;
    b.vinyl.style.animation = b.prevAnimation;
    b.vinyl.style.animationPlayState = b.prevAnimationPlayState
        || (state.isPlaying ? 'running' : 'paused');
    b.vinyl.style.transform = b.prevTransform;
    b.tonearm.style.transform = b.prevTonearmTransform;
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
    cachedBase = null;
    cachedVinyl = null;
    cachedSheen = null;
    cachedTonearm = null;
    vinylRect = null;
    sheenRect = null;
    tonearmRect = null;
    canvasScale = 1;
    baseCapturePending = false;
    lastBaseCapturedAt = 0;
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

async function captureViaH2I(node, extra = {}) {
    return Promise.race([
        toCanvas(node, {
            pixelRatio: 1,
            cacheBust: false,
            skipFonts: true,
            skipAutoScale: true,
            ...extra,
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('capture-timeout')), 2000)
        ),
    ]);
}

// html-to-image can't render an SVG element (nested SVG inside foreignObject
// produces blank pixels in Chrome). Render the SVG directly via XMLSerializer
// + Image instead, which the browser parses as a real SVG document.
async function captureSvgElement(svgEl, scale = 2) {
    const clone = svgEl.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.transition = 'none';

    // Preserve the CSS drop-shadow filter that lives outside the SVG.
    const cs = getComputedStyle(svgEl);
    if (cs.filter && cs.filter !== 'none') {
        clone.style.filter = cs.filter;
    }

    // Use the live element's layout-box size — clone may be detached.
    const rect = svgEl.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    if (!clone.getAttribute('xmlns')) {
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const svgString = new XMLSerializer().serializeToString(clone);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx2 = canvas.getContext('2d');
            ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas);
        };
        img.onerror = () => reject(new Error('svg-image-load-failed'));
        img.src = url;
    });
}

function maskToCircle(srcCanvas) {
    const c = document.createElement('canvas');
    c.width = srcCanvas.width;
    c.height = srcCanvas.height;
    const cctx = c.getContext('2d');
    cctx.beginPath();
    cctx.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2, 0, 2 * Math.PI);
    cctx.clip();
    cctx.drawImage(srcCanvas, 0, 0);
    return c;
}

async function setupExportLayers() {
    const vinylEl = document.getElementById('vinyl');
    const tonearmEl = document.getElementById('tonearm');
    const sheenEl = document.querySelector('.vinyl-sheen');
    const wrapEl = document.querySelector('.vinyl-wrap');

    // Compute LAYOUT positions from vinyl-wrap, which has no transform of its
    // own, so its bounding rect is always the true untransformed box. We DON'T
    // touch the live elements (no animation pause / visible freeze).
    const fRect = frameEl.getBoundingClientRect();
    const wrapRect = wrapEl.getBoundingClientRect();
    canvasScale = canvasW / fRect.width;

    const wrapX = (wrapRect.left - fRect.left) * canvasScale;
    const wrapY = (wrapRect.top - fRect.top) * canvasScale;
    const wrapW = wrapRect.width * canvasScale;
    const wrapH = wrapRect.height * canvasScale;

    // Vinyl & sheen are 100% of vinyl-wrap (vinyl-record width:100%/height:100%;
    // sheen inset:0).
    vinylRect = { x: wrapX, y: wrapY, width: wrapW, height: wrapH };
    sheenRect = { x: wrapX, y: wrapY, width: wrapW, height: wrapH };

    // Tonearm: CSS positions it at top:-10%, right:-8%, width:22%, height:75%.
    // right:-8% means tonearm.right = wrap.right + 0.08 * wrap.width →
    // tonearm.left = wrap.right + 0.08*W - 0.22*W = wrap.right - 0.14*W.
    tonearmRect = {
        x: wrapX + wrapW * (1 - 0.14),
        y: wrapY - wrapH * 0.10,
        width: wrapW * 0.22,
        height: wrapH * 0.75,
    };

    // Capture clones with style overrides — html-to-image applies these to the
    // cloned root before rendering, leaving the live DOM untouched.
    cachedVinyl = await captureViaH2I(vinylEl, {
        pixelRatio: 2,
        style: { animation: 'none', transform: 'rotate(0deg)' },
    });
    cachedVinyl = maskToCircle(cachedVinyl);

    cachedSheen = await captureViaH2I(sheenEl, { pixelRatio: 2 });
    cachedSheen = maskToCircle(cachedSheen);

    cachedTonearm = await captureSvgElement(tonearmEl, 2);

    await refreshBase();
}

// Capture the frame WITHOUT vinyl-record, sheen, or tonearm. The vinyl-wrap
// container stays so the layout (player-mid + player-bottom positions) is
// preserved exactly. We composite the dynamic layers on top per frame.
async function refreshBase() {
    if (baseCapturePending) return;
    baseCapturePending = true;
    try {
        cachedBase = await captureViaH2I(frameEl, {
            filter: (node) => {
                if (!node) return true;
                if (node.id === 'vinyl' || node.id === 'tonearm') return false;
                if (node.classList && node.classList.contains('vinyl-sheen')) return false;
                return true;
            },
        });
        lastBaseCapturedAt = performance.now();
    } catch {}
    baseCapturePending = false;
}

// Cheap per-frame composite. ~5 drawImages → trivial cost at 60fps.
function drawFrame() {
    if (!ctx || !cachedBase) return;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1) Base: frame bg, header, meta, lyrics, progress, controls.
    ctx.drawImage(cachedBase, 0, 0, canvasW, canvasH);

    // 2) Vinyl drop shadow. CSS `box-shadow: 0 24px 80px rgba(0,0,0,0.6)` —
    // gets cropped when we capture vinyl alone, so re-create it here.
    if (vinylRect) {
        const cx = vinylRect.x + vinylRect.width / 2;
        const cy = vinylRect.y + vinylRect.height / 2;
        const r = vinylRect.width / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 80 * canvasScale;
        ctx.shadowOffsetY = 24 * canvasScale;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.96, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }

    // 3) Vinyl, rotated. Angle driven by audio time → smooth & deterministic.
    if (cachedVinyl && vinylRect && exportAudio) {
        const audioT = exportAudio.currentTime;
        const angleRad = (audioT / VINYL_SPIN_PERIOD_S) * 2 * Math.PI;
        const cx = vinylRect.x + vinylRect.width / 2;
        const cy = vinylRect.y + vinylRect.height / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angleRad);
        ctx.drawImage(
            cachedVinyl,
            -vinylRect.width / 2,
            -vinylRect.height / 2,
            vinylRect.width,
            vinylRect.height
        );
        ctx.restore();
    }

    // 4) Sheen — soft highlight, sits above vinyl in DOM z-order.
    if (cachedSheen && sheenRect) {
        ctx.drawImage(
            cachedSheen,
            sheenRect.x, sheenRect.y,
            sheenRect.width, sheenRect.height
        );
    }

    // 5) Tonearm — captured at angle 0; rotate 16° around its CSS pivot
    //    (transform-origin: 50% 10%) so the geometry matches the editor.
    if (cachedTonearm && tonearmRect) {
        const pivotX = tonearmRect.x + tonearmRect.width * 0.5;
        const pivotY = tonearmRect.y + tonearmRect.height * 0.10;
        const angleRad = 16 * Math.PI / 180;
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(angleRad);
        ctx.translate(-pivotX, -pivotY);
        ctx.drawImage(
            cachedTonearm,
            tonearmRect.x, tonearmRect.y,
            tonearmRect.width, tonearmRect.height
        );
        ctx.restore();
    }
}

function renderLoop() {
    if (!state.isExporting) return;
    if (liveDomBindings) syncLiveDomToExportAudio(liveDomBindings);
    drawFrame();

    // Refresh base in the background so text / progress / lyrics stay current.
    if (!baseCapturePending && performance.now() - lastBaseCapturedAt >= BASE_REFRESH_MS) {
        refreshBase();
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

        const canvasStream = canvas.captureStream(OUTPUT_FPS);
        const AudioCtxCtor = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtxCtor();

        // Some browsers create the context in 'suspended' state pending a user
        // gesture. The export button click qualifies — resume() unblocks audio.
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const source = audioCtx.createMediaElementSource(exportAudio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);

        if (!isFinite(exportAudio.duration) || exportAudio.duration <= 0) {
            throw new Error('Audio has no valid duration. Try re-encoding the file.');
        }

        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
        ]);

        const mimeType = pickMimeType();
        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Setting up recorder…' });

        recorder = new MediaRecorder(combined, { mimeType });
        recordedChunks = [];

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) recordedChunks.push(event.data);
        };

        recorder.onerror = (e) => {
            console.error('[export] recorder error:', e.error?.name, e.error?.message);
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
        // timeslice=1000 → ondataavailable fires every 1s; otherwise chunks
        // only arrive at stop, hiding mid-recording problems.
        recorder.start(1000);

        // Authoritative end-of-audio signal — more reliable than polling
        // currentTime, which may not hit duration exactly.
        exportAudio.addEventListener('ended', () => {
            if (!state.isExporting) return;
            if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
            stopRecording();
        }, { once: true });

        try {
            await exportAudio.play();
        } catch (err) {
            throw new Error(`Could not start audio playback: ${err.message || err.name}`);
        }

        // Pause render + recorder if the user switches tabs; resume when they return.
        setupVisibilityHandler();

        // Capture the 3 static layers BEFORE the render loop spins up, otherwise
        // the first few hundred ms of video would be blank.
        emit(Events.EXPORT_PROGRESS, { progress: 22, message: 'Preparing visuals…' });
        await setupExportLayers();

        lastCaptureTime = 0;
        animationId = requestAnimationFrame(renderLoop);

        // Drive progress off exportAudio.currentTime so it auto-pauses
        // when the user backgrounds the tab. A stall watchdog also catches
        // the case where playback silently dies — we fail fast instead of
        // waiting for the 5-minute global timeout.
        const duration = exportAudio.duration;
        let lastSeenTime = 0;
        let stallTicks = 0;
        progressInterval = setInterval(() => {
            if (!exportAudio || exportAudio.paused) return;
            const elapsed = exportAudio.currentTime;

            // Stall detection: if currentTime hasn't moved for ~4s while playing
            if (Math.abs(elapsed - lastSeenTime) < 0.01) {
                stallTicks += 1;
                if (stallTicks >= 20) {       // 20 × 200ms = 4s of no progress
                    clearInterval(progressInterval);
                    progressInterval = null;
                    cleanup();
                    resumeMainAudioIfPaused();
                    emit(Events.EXPORT_ERROR,
                        'Audio playback stalled. Try a different audio file or browser.');
                    return;
                }
            } else {
                stallTicks = 0;
                lastSeenTime = elapsed;
            }

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
    // Stop in BOTH 'recording' and 'paused' states — spec allows it, and our
    // visibility handler can leave the recorder paused.
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        try {
            recorder.stop();
        } catch {}
    }

    // Fallback: if onstop hasn't fired in 2s, finalize manually.
    if (recorder && recorder.state !== 'inactive') {
        setTimeout(() => {
            if (state.isExporting && recorder && recorder.state !== 'inactive') {
                const cb = recorder.onstop;
                recorder.onstop = null;
                if (typeof cb === 'function') cb();
            }
        }, 2000);
    }

    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
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
