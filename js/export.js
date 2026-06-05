import { emit, on, Events } from './lib/events.js';
import { state, RATIOS, FORMATS } from './lib/state.js';
import { setPlayerPlaying } from './player.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { toCanvas } from './vendor/html-to-image.js';
import { icon } from './icons.js';
import { formatTime } from './lib/format.js';
import { getFontEmbedCss } from './font-manager.js';

// Safety net while loading metadata, before the real duration is known. Once we
// have the audio duration we replace this with `duration + buffer` so long
// songs aren't cut off by a fixed cap (see startVideoRecording).
const INIT_TIMEOUT_MS = 60 * 1000;
const EXPORT_TIMEOUT_BUFFER_MS = 60 * 1000;
// Video at 30fps. Canvas updates at rAF (~60fps) so the video stream always
// has a fresh frame to sample. Vinyl rotation is computed every frame; the
// expensive html-to-image work only fires at setup + every BASE_REFRESH_MS.
const OUTPUT_FPS = 30;
// Target video bitrate ≈ bits-per-pixel-per-frame × pixels × fps. At native
// 1080-class resolutions ~0.09 stays sharp while keeping files reasonable
// (≈5 Mbps @1080p); platforms re-encode on upload anyway. Raise toward 0.14
// for maximum quality, lower toward 0.07 for smaller files.
const VIDEO_BITS_PER_PIXEL = 0.09;
const AUDIO_BITS_PER_SECOND = 128_000;
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
let frameEl = null;
let audioObjectUrl = null;       // revoked in cleanup() — was leaking before
let finalized = false;           // guards against double-finalize (onstop + fallback)
let resizeHandler = null;        // recomputes layer rects if the frame resizes mid-export
let exportLyrics = [];
let liveDomBindings = null;     // {ref to update progress/lyrics in editor}
let visibilityHandler = null;
let backgroundToastDismiss = null;
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
let exportFontCss = null;         // @font-face data-URL CSS for the picked player font

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
    const fmt = FORMATS[state.videoFormat] || FORMATS.webm;
    // Try the chosen format first, then fall through to WebM so a stale or
    // unsupported choice still records with whatever the browser can mux.
    const candidates = [...fmt.candidates, ...FORMATS.webm.candidates];
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function disableControls(disabled) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

// ──────────────────────────────────────────────────────────────────
// Editor-DOM driving during export
//
// We capture the live `.frame` element each frame. To keep it visually
// "playing" we override a few things directly on the DOM:
//   • freeze the CSS spin and drive the vinyl angle from exportAudio time
//     (same formula as drawFrame) + force the tonearm "playing" pose
//   • drive lyrics text, progress bar fill and time labels from exportAudio
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
    // Freeze the CSS spin and drive the angle from exportAudio.currentTime
    // instead (see syncLiveDomToExportAudio) — same formula as drawFrame, so
    // the editor preview mirrors the exported video exactly: 0° at 0:00.
    // Restarting the CSS animation here isn't enough — it begins spinning
    // during the ~1s of setup (audio load + layer capture) before recording
    // starts, leaving the preview ahead of the video by that latency.
    b.vinyl.style.animationName = 'none';
    b.vinyl.style.transform = 'rotate(0deg)';

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

    // Vinyl angle — identical formula to drawFrame, so preview === video.
    b.vinyl.style.transform = `rotate(${(t / VINYL_SPIN_PERIOD_S) * 360}deg)`;

    // Lyrics — boundary matches player.js getCurrentLyric (>= start, < end)
    // so the editor preview and the exported video stay frame-consistent.
    const current = exportLyrics.find(l => t >= l.start && t < l.end);
    const nextLyric = current ? current.text : '';
    if (nextLyric !== b.lyricsEl.textContent) {
        b.lyricsEl.textContent = nextLyric;
    }

    // Progress + time labels
    if (dur > 0) {
        b.progressEl.style.width = `${Math.min(t / dur * 100, 100)}%`;
    }
    b.curEl.textContent = formatTime(t);
    b.totEl.textContent = formatTime(dur);
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
    if (audioObjectUrl) { URL.revokeObjectURL(audioObjectUrl); audioObjectUrl = null; }
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
    exportFontCss = null;
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    disableControls(false);
    state.isExporting = false;
}

// Abort an in-flight export from an error path. Stops the recorder with its
// onstop detached and `finalized` set, so neither the native 'stop' event nor
// the stopRecording fallback can emit a stray EXPORT_COMPLETE afterwards —
// and the recorder can't keep accumulating chunks forever.
function abortExport(message) {
    finalized = true;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        recorder.onstop = null;
        try { recorder.stop(); } catch {}
    }
    cleanup();
    resumeMainAudioIfPaused();
    emit(Events.EXPORT_ERROR, message);
}

// (Re)arm the global export timeout from the audio position: remaining audio
// + a fixed buffer. Called once recording starts and again on tab-visible,
// so time spent paused in a background tab doesn't count against the export.
function armExportTimeout() {
    if (timeoutId) clearTimeout(timeoutId);
    if (!exportAudio) return;
    const remainingS = Math.max(0, (exportAudio.duration || 0) - exportAudio.currentTime);
    timeoutId = setTimeout(() => {
        abortExport('Export timed out. Please try again.');
    }, remainingS * 1000 + EXPORT_TIMEOUT_BUFFER_MS);
}

function setupVisibilityHandler() {
    visibilityHandler = () => {
        if (!state.isExporting || !recorder || !exportAudio) return;

        if (document.hidden) {
            // Tab backgrounded — rAF will throttle to ~1Hz. Pause everything so
            // audio + video stay in sync; resume when the user returns. The
            // global timeout is suspended too — paused time shouldn't count.
            try { exportAudio.pause(); } catch {}
            try { if (recorder.state === 'recording') recorder.pause(); } catch {}
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
            backgroundToastDismiss = toastInfo(
                'Export paused — return to this tab to continue.',
                { duration: 0 }
            );
        } else {
            try { if (recorder.state === 'paused') recorder.resume(); } catch {}
            try { exportAudio.play(); } catch {}
            armExportTimeout();
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

// Compute LAYOUT positions from vinyl-wrap, which has no transform of its
// own, so its bounding rect is always the true untransformed box. We DON'T
// touch the live elements (no animation pause / visible freeze). Re-run on
// window resize during export — the frame is responsive, and stale rects
// would draw the disc/tonearm at the wrong place on the canvas.
function computeLayerRects() {
    const wrapEl = document.querySelector('.vinyl-wrap');
    if (!frameEl || !wrapEl) return;

    const fRect = frameEl.getBoundingClientRect();
    const wrapRect = wrapEl.getBoundingClientRect();
    if (fRect.width <= 0) return;
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
}

async function setupExportLayers() {
    const vinylEl = document.getElementById('vinyl');
    const tonearmEl = document.getElementById('tonearm');
    const sheenEl = document.querySelector('.vinyl-sheen');

    // html-to-image rasterizes inside an isolated SVG document where page
    // webfonts don't exist — non-default player fonts must be embedded as
    // data URLs or the export silently falls back to a system font. Resolved
    // ONCE here (cached per family in font-manager), never on the capture path.
    exportFontCss = await getFontEmbedCss();

    computeLayerRects();
    resizeHandler = () => computeLayerRects();
    window.addEventListener('resize', resizeHandler);

    // Sample every layer at the canvas's true pixel density (canvas-px per
    // on-screen CSS-px). At pixelRatio 1 the captures came out at the small
    // on-screen size and were then upscaled into the larger export canvas —
    // that upscale was the source of the blurry text/vinyl. Floor at 2 so the
    // record grooves stay crisp even when the preview frame is small.
    const sampleRatio = Math.max(2, canvasScale);

    // Capture clones with style overrides — html-to-image applies these to the
    // cloned root before rendering, leaving the live DOM untouched.
    cachedVinyl = await captureViaH2I(vinylEl, {
        pixelRatio: sampleRatio,
        style: { animation: 'none', transform: 'rotate(0deg)' },
    });
    cachedVinyl = maskToCircle(cachedVinyl);

    cachedSheen = await captureViaH2I(sheenEl, { pixelRatio: sampleRatio });
    cachedSheen = maskToCircle(cachedSheen);

    cachedTonearm = await captureSvgElement(tonearmEl, sampleRatio);

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
            // Render at the export canvas resolution (not the small on-screen
            // size) so text, lyrics, progress bar and controls stay sharp.
            pixelRatio: Math.max(1, canvasScale),
            // undefined → html-to-image keeps the skipFonts fast path.
            fontEmbedCSS: exportFontCss || undefined,
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

async function startVideoRecording({ audioFile, songTitle }) {
    if (state.isExporting) return;
    state.isExporting = true;
    finalized = false;

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
            abortExport('Export setup timed out. Please try again.');
        }, INIT_TIMEOUT_MS);

        emit(Events.EXPORT_PROGRESS, { progress: 1, message: 'Initializing export…' });

        createCanvas();

        // Bind to live DOM elements so renderFrame can drive them from exportAudio
        liveDomBindings = snapshotLiveDom();
        applyLiveExportState(liveDomBindings);

        // Album art: nothing to do — html-to-image will capture the live element which
        // already shows the user-uploaded art via theme.js / album-art.js.

        emit(Events.EXPORT_PROGRESS, { progress: 2, message: 'Loading audio…' });

        audioObjectUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioObjectUrl);
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

        // Now that we know the real length, replace the init safety net with a
        // duration-based cap so long songs aren't cut off by a fixed timeout.
        armExportTimeout();

        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
        ]);

        const mimeType = pickMimeType();
        emit(Events.EXPORT_PROGRESS, { progress: 3, message: 'Setting up recorder…' });

        const videoBitsPerSecond = Math.round(canvasW * canvasH * OUTPUT_FPS * VIDEO_BITS_PER_PIXEL);
        recorder = new MediaRecorder(combined, {
            mimeType,
            videoBitsPerSecond,
            audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        });
        recordedChunks = [];

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) recordedChunks.push(event.data);
        };

        recorder.onerror = (e) => {
            console.error('[export] recorder error:', e.error?.name, e.error?.message);
        };

        // Idempotent — may be invoked by the native 'stop' event OR the manual
        // fallback in stopRecording(). The `finalized` guard ensures the blob is
        // emitted exactly once.
        recorder.onstop = () => {
            if (finalized) return;
            finalized = true;

            const videoBlob = new Blob(recordedChunks, { type: mimeType });
            const safeName = (songTitle || '').replace(/[<>:"/\\|?*]/g, '').trim();
            // Extension must match the container the recorder actually used —
            // pickMimeType may have fallen back to WebM despite an MP4 choice.
            const ext = mimeType.startsWith('video/mp4') ? '.mp4' : '.webm';
            const fileName = (safeName || 'untitled') + ext;

            emit(Events.EXPORT_PROGRESS, { progress: 100, message: 'Done.' });
            emit(Events.EXPORT_COMPLETE, { videoBlob, fileName });

            // Full teardown (timers, audio, caches, object URL, DOM restore).
            cleanup();
            resumeMainAudioIfPaused();
        };

        // Reset the visible progress / lyric / time labels to exportAudio's
        // t=0 BEFORE the first base capture. Without this, exporting mid-song
        // bakes the editor's stale state (progress at 0:30, current lyric)
        // into the base layer, and the video opens with that frozen frame
        // until the first BASE_REFRESH_MS re-capture snaps it back to 0:00.
        syncLiveDomToExportAudio(liveDomBindings);

        // Capture the static layers and paint the first frame BEFORE the recorder
        // and audio start. Otherwise the canvas stream records blank frames (and
        // the audio runs ahead of the visuals) for the few hundred ms that the
        // html-to-image capture takes.
        emit(Events.EXPORT_PROGRESS, { progress: 4, message: 'Preparing visuals…' });
        await setupExportLayers();
        drawFrame();
        animationId = requestAnimationFrame(renderLoop);

        emit(Events.EXPORT_PROGRESS, { progress: 5, message: 'Recording…' });
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

        // Drive progress off exportAudio.currentTime so it auto-pauses
        // when the user backgrounds the tab. A stall watchdog also catches
        // the case where playback silently dies — we fail fast instead of
        // waiting for the duration-based global timeout.
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
                    // abortExport → cleanup clears this interval too.
                    abortExport('Audio playback stalled. Try a different audio file or browser.');
                    return;
                }
            } else {
                stallTicks = 0;
                lastSeenTime = elapsed;
            }

            // Setup owns 0–5%; recording sweeps the remaining 5→99 linearly with
            // the audio, so the fill never jumps — 100 lands on finalize ('Done.').
            const progress = Math.min(5 + (elapsed / duration) * 94, 99);
            emit(Events.EXPORT_PROGRESS, { progress, message: `Recording… ${Math.round(progress)}%` });

            if (elapsed >= duration - 0.05) {
                clearInterval(progressInterval);
                progressInterval = null;
                stopRecording();
            }
        }, 200);

    } catch (error) {
        abortExport(error.message || 'Unknown error occurred');
    }
}

function stopRecording() {
    // Stop in BOTH 'recording' and 'paused' states — spec allows it, and our
    // visibility handler can leave the recorder paused. The 'stop' event then
    // fires recorder.onstop, which finalizes the blob and runs cleanup().
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        try {
            recorder.stop();
        } catch {}
    }

    // Fallback: guarantee finalization even if the native 'stop' event never
    // fires (observed on some browsers). onstop is idempotent — guarded by
    // `finalized` — so it's safe if the native event also fires.
    setTimeout(() => {
        if (!finalized && typeof recorder?.onstop === 'function') recorder.onstop();
    }, 2000);
}

function cancelExport() {
    if (!state.isExporting) return;
    // Block both the native 'stop' event and the stopRecording fallback from
    // emitting a (now unwanted) EXPORT_COMPLETE.
    finalized = true;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        recorder.onstop = null;
        try { recorder.stop(); } catch {}
    }
    cleanup();
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
        ['MP4 (H.264)',      hasMR && FORMATS.mp4.candidates.some(t => MediaRecorder.isTypeSupported(t))],
    ];

    // MP4 is a nice-to-have (Firefox can't mux it) — don't fail the check on it.
    const mp4Ok = checks.find(([k]) => k === 'MP4 (H.264)')[1];
    const allOk = checks.every(([k, ok]) => ok || k === 'MP4 (H.264)');
    const webmOk = checks.find(([k]) => k === 'WebM')[1];

    if (allOk) {
        toastSuccess(mp4Ok
            ? 'Your browser supports MP4 and WebM export.'
            : 'Your browser supports WebM export (MP4 not available).');
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

    on(Events.EXPORT_REQUESTED, ({ audioFile, songTitle, artistName }) => {
        if (state.isExporting) return;
        if (!window.MediaRecorder) {
            emit(Events.EXPORT_ERROR,
                'MediaRecorder API is not supported in this browser. Please use Chrome, Firefox, or Edge.');
            return;
        }
        // Reflect the latest title/artist into the live frame so the capture
        // picks them up; the rest of the export reads from the DOM + state.
        if (songTitle) document.querySelector('.vinyl-song-title').textContent = songTitle;
        if (artistName) document.querySelector('.vinyl-artist-name').textContent = artistName;

        startVideoRecording({ audioFile, songTitle });
    });

    on(Events.DEBUG_BROWSER_SUPPORT, debugBrowserSupport);
    on(Events.EXPORT_CANCEL, cancelExport);
}
