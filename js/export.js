import { emit, on, Events } from './lib/events.js';
import { state, RATIOS } from './lib/state.js';
import { setPlayerPlaying } from './player.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { debugBrowserSupport, initExportSupportModal } from './export-support.js';
import { pickExportMimeType } from './export-media.js';
import {
    applyExportDomState,
    restoreExportDom,
    snapshotExportDom,
    syncExportDom,
} from './export-dom.js';
import { createExportRenderer } from './export-renderer.js';
import { createExportSession } from './export-session.js';

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
const VINYL_SPIN_PERIOD_S = 8;       // matches CSS `spin 8s linear infinite`

let active = null;
let exportRunId = 0;             // invalidates async setup after cancellation

function ensureActiveExport(runId) {
    if (!state.isExporting || runId !== exportRunId) {
        const error = new Error('Export cancelled.');
        error.name = 'AbortError';
        throw error;
    }
}

// ──────────────────────────────────────────────────────────────────
// Setup helpers
// ──────────────────────────────────────────────────────────────────

function createCanvas() {
    const dims = RATIOS[state.aspectRatio] || RATIOS['9:16'];
    active.renderer = createExportRenderer({ dimensions: dims, visualizerEnabled: state.visualizerEnabled });
    active.canvas = active.renderer.canvas;
    active.canvasW = active.renderer.width;
    active.canvasH = active.renderer.height;
}

function disableControls(disabled) {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.disabled = disabled;
    });
}

// ──────────────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────────────

function cleanup(session = active) {
    if (!session) return;
    if (session.timeoutId) { clearTimeout(session.timeoutId); session.timeoutId = null; }
    if (session.progressInterval) { clearInterval(session.progressInterval); session.progressInterval = null; }
    if (session.animationId) { cancelAnimationFrame(session.animationId); session.animationId = null; }
    teardownVisibilityHandler(session);
    if (session.exportAudio) { session.exportAudio.pause(); session.exportAudio = null; }
    if (session.audioCtx) { session.audioCtx.close().catch(() => {}); session.audioCtx = null; }
    if (session.renderer) { session.renderer.destroy(); session.renderer = null; }
    if (session.audioObjectUrl) { URL.revokeObjectURL(session.audioObjectUrl); session.audioObjectUrl = null; }
    if (session.liveDomBindings) { restoreExportDom(session.liveDomBindings, state.isPlaying); session.liveDomBindings = null; }
    session.exportEndTime = null;
    disableControls(false);
    if (active === session) state.isExporting = false;
}

// Abort an in-flight export from an error path. Stops the recorder with its
// onstop detached and `finalized` set, so neither the native 'stop' event nor
// the stopRecording fallback can emit a stray EXPORT_COMPLETE afterwards —
// and the recorder can't keep accumulating chunks forever.
function abortExport(message, session = active) {
    if (!session || active !== session) return;
    session.finalized = true;
    if (session.recorder && (session.recorder.state === 'recording' || session.recorder.state === 'paused')) {
        session.recorder.onstop = null;
        try { session.recorder.stop(); } catch {}
    }
    cleanup(session);
    resumeMainAudioIfPaused(session);
    emit(Events.EXPORT_ERROR, message);
}

// (Re)arm the global export timeout from the audio position: remaining audio
// + a fixed buffer. Called once recording starts and again on tab-visible,
// so time spent paused in a background tab doesn't count against the export.
function armExportTimeout(session = active) {
    if (!session?.exportAudio) return;
    if (session.timeoutId) clearTimeout(session.timeoutId);
    const stopAt = session.exportEndTime ?? session.exportAudio.duration ?? 0;
    const remainingS = Math.max(0, stopAt - session.exportAudio.currentTime);
    session.timeoutId = setTimeout(() => {
        abortExport('Export timed out. Please try again.', session);
    }, remainingS * 1000 + EXPORT_TIMEOUT_BUFFER_MS);
}

function setupVisibilityHandler(session = active) {
    session.visibilityHandler = () => {
        if (!state.isExporting || active !== session || !session.recorder || !session.exportAudio) return;

        if (document.hidden) {
            // Tab backgrounded — rAF will throttle to ~1Hz. Pause everything so
            // audio + video stay in sync; resume when the user returns. The
            // global timeout is suspended too — paused time shouldn't count.
            try { session.exportAudio.pause(); } catch {}
            try { if (session.recorder.state === 'recording') session.recorder.pause(); } catch {}
            if (session.timeoutId) { clearTimeout(session.timeoutId); session.timeoutId = null; }
            session.backgroundToastDismiss = toastInfo(
                'Export paused — return to this tab to continue.',
                { duration: 0 }
            );
        } else {
            try { if (session.recorder.state === 'paused') session.recorder.resume(); } catch {}
            try { session.exportAudio.play(); } catch {}
            armExportTimeout(session);
            if (session.backgroundToastDismiss) {
                session.backgroundToastDismiss();
                session.backgroundToastDismiss = null;
            }
        }
    };
    document.addEventListener('visibilitychange', session.visibilityHandler);
}

function teardownVisibilityHandler(session = active) {
    if (session.visibilityHandler) {
        document.removeEventListener('visibilitychange', session.visibilityHandler);
        session.visibilityHandler = null;
    }
    if (session.backgroundToastDismiss) {
        session.backgroundToastDismiss();
        session.backgroundToastDismiss = null;
    }
}

function resumeMainAudioIfPaused(session = active) {
    if (!session?.wasMainAudioPlaying || !state.audioElement) return;
    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch(() => {});
}
function renderLoop(session) {
    if (!state.isExporting || active !== session) return;
    if (session.liveDomBindings) syncExportDom(session.liveDomBindings, session.exportAudio, session.exportLyrics, VINYL_SPIN_PERIOD_S);
    session.renderer?.drawFrame(session.exportAudio, session.exportLyrics);
    session.renderer?.refreshIfDue(session.exportLyrics);

    session.animationId = requestAnimationFrame(() => renderLoop(session));
}

// ──────────────────────────────────────────────────────────────────
// Recording orchestrator
// ──────────────────────────────────────────────────────────────────

async function startVideoRecording({ audioFile, songTitle, rangeStart = 0, rangeEnd = null }) {
    if (state.isExporting) return;
    const session = createExportSession();
    active = session;
    state.isExporting = true;
    const runId = ++exportRunId;
    session.finalized = false;

    session.wasMainAudioPlaying = !!(state.audioElement && !state.audioElement.paused);

    // Hard-stop the editor's audio so its timeupdate doesn't fight with our
    // export-driven DOM updates. We force the visual spin back on below via
    // applyExportDomState() so the recorded frame still shows the record turning.
    if (session.wasMainAudioPlaying && state.audioElement) {
        state.audioElement.pause();
        setPlayerPlaying(false);
    }

    disableControls(true);

    try {
        session.timeoutId = setTimeout(() => {
            abortExport('Export setup timed out. Please try again.', session);
        }, INIT_TIMEOUT_MS);

        emit(Events.EXPORT_PROGRESS, { progress: 1, message: 'Initializing export…' });

        createCanvas();

        // Bind to live DOM elements so renderFrame can drive them from export audio.
        session.liveDomBindings = snapshotExportDom();
        applyExportDomState(session.liveDomBindings);

        // Album art: nothing to do — html-to-image will capture the live element which
        // already shows the user-uploaded art via theme.js / album-art.js.

        emit(Events.EXPORT_PROGRESS, { progress: 2, message: 'Loading audio…' });

        session.audioObjectUrl = URL.createObjectURL(audioFile);
        session.exportAudio = new Audio(session.audioObjectUrl);
        session.exportLyrics = [...state.lyrics];

        await new Promise((resolve, reject) => {
            session.exportAudio.addEventListener('loadedmetadata', resolve);
            session.exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });
        ensureActiveExport(runId);

        const canvasStream = session.canvas.captureStream(OUTPUT_FPS);
        const AudioCtxCtor = window.AudioContext || window.webkitAudioContext;
        session.audioCtx = new AudioCtxCtor();

        // Some browsers create the context in 'suspended' state pending a user
        // gesture. The export button click qualifies — resume() unblocks audio.
        if (session.audioCtx.state === 'suspended') {
            await session.audioCtx.resume();
            ensureActiveExport(runId);
        }

        const source = session.audioCtx.createMediaElementSource(session.exportAudio);
        const analyser = session.audioCtx.createAnalyser();
        analyser.fftSize = 128;
        session.renderer.setAnalyser(analyser);
        const destination = session.audioCtx.createMediaStreamDestination();
        source.connect(analyser);
        analyser.connect(destination);

        if (!isFinite(session.exportAudio.duration) || session.exportAudio.duration <= 0) {
            throw new Error('Audio has no valid duration. Try re-encoding the file.');
        }

        const startTime = Math.min(Math.max(rangeStart, 0), session.exportAudio.duration - 0.01);
        session.exportEndTime = rangeEnd === null ? session.exportAudio.duration : Math.min(rangeEnd, session.exportAudio.duration);
        if (session.exportEndTime <= startTime) throw new Error('Export segment is outside this audio file.');
        session.exportAudio.currentTime = startTime;

        // Now that we know the real length, replace the init safety net with a
        // duration-based cap so long songs aren't cut off by a fixed timeout.
        armExportTimeout(session);

        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
        ]);

        const mimeType = pickExportMimeType(state.videoFormat);
        emit(Events.EXPORT_PROGRESS, { progress: 3, message: 'Setting up recorder…' });

        const videoBitsPerSecond = Math.round(session.canvasW * session.canvasH * OUTPUT_FPS * VIDEO_BITS_PER_PIXEL);
        session.recorder = new MediaRecorder(combined, {
            mimeType,
            videoBitsPerSecond,
            audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
        });
        session.recordedChunks = [];

        session.recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) session.recordedChunks.push(event.data);
        };

        session.recorder.onerror = (e) => {
            console.error('[export] recorder error:', e.error?.name, e.error?.message);
        };

        // Idempotent — may be invoked by the native 'stop' event OR the manual
        // fallback in stopRecording(). The `session.finalized` guard ensures the blob is
        // emitted exactly once.
        session.recorder.onstop = () => {
            if (session.finalized) return;
            session.finalized = true;

            const videoBlob = new Blob(session.recordedChunks, { type: mimeType });
            const safeName = (songTitle || '').replace(/[<>:"/\\|?*]/g, '').trim();
            // Extension must match the container the recorder actually used —
            // pickMimeType may have fallen back to WebM despite an MP4 choice.
            const ext = mimeType.startsWith('video/mp4') ? '.mp4' : '.webm';
            const fileName = (safeName || 'untitled') + ext;

            emit(Events.EXPORT_PROGRESS, { progress: 100, message: 'Done.' });
            emit(Events.EXPORT_COMPLETE, { videoBlob, fileName });

            // Full teardown (timers, audio, caches, object URL, DOM restore).
            cleanup(session);
            resumeMainAudioIfPaused(session);
        };

        // Reset the visible progress / lyric / time labels to session.exportAudio's
        // t=0 BEFORE the first base capture. Without this, exporting mid-song
        // bakes the editor's stale state (progress at 0:30, current lyric)
        // into the base layer, and the video opens with that frozen frame
        // until the first BASE_REFRESH_MS re-capture snaps it back to 0:00.
        syncExportDom(session.liveDomBindings, session.exportAudio, session.exportLyrics, VINYL_SPIN_PERIOD_S);

        // Capture the static layers and paint the first frame BEFORE the recorder
        // and audio start. Otherwise the canvas stream records blank frames (and
        // the audio runs ahead of the visuals) for the few hundred ms that the
        // html-to-image capture takes.
        emit(Events.EXPORT_PROGRESS, { progress: 4, message: 'Preparing visuals…' });
        await session.renderer.setup(session.exportLyrics);
        ensureActiveExport(runId);
        session.renderer.drawFrame(session.exportAudio, session.exportLyrics);
        session.animationId = requestAnimationFrame(() => renderLoop(session));

        emit(Events.EXPORT_PROGRESS, { progress: 5, message: 'Recording…' });
        // timeslice=1000 → ondataavailable fires every 1s; otherwise chunks
        // only arrive at stop, hiding mid-recording problems.
        session.recorder.start(1000);

        // Authoritative end-of-audio signal — more reliable than polling
        // currentTime, which may not hit duration exactly.
        session.exportAudio.addEventListener('ended', () => {
            if (!state.isExporting || active !== session) return;
            if (session.progressInterval) { clearInterval(session.progressInterval); session.progressInterval = null; }
            stopRecording(session);
        }, { once: true });

        try {
            await session.exportAudio.play();
            ensureActiveExport(runId);
        } catch (err) {
            throw new Error(`Could not start audio playback: ${err.message || err.name}`);
        }

        // Pause render + recorder if the user switches tabs; resume when they return.
        setupVisibilityHandler(session);

        // Drive progress off exportAudio.currentTime so it auto-pauses
        // when the user backgrounds the tab. A stall watchdog also catches
        // the case where playback silently dies — we fail fast instead of
        // waiting for the duration-based global timeout.
        let lastSeenTime = 0;
        let stallTicks = 0;
        session.progressInterval = setInterval(() => {
            if (!session.exportAudio || session.exportAudio.paused) return;
            const elapsed = session.exportAudio.currentTime;

            // Stall detection: if currentTime hasn't moved for ~4s while playing
            if (Math.abs(elapsed - lastSeenTime) < 0.01) {
                stallTicks += 1;
                if (stallTicks >= 20) {       // 20 × 200ms = 4s of no progress
                    // abortExport → cleanup clears this interval too.
                    abortExport('Audio playback stalled. Try a different audio file or browser.', session);
                    return;
                }
            } else {
                stallTicks = 0;
                lastSeenTime = elapsed;
            }

            // Setup owns 0–5%; recording sweeps the remaining 5→99 linearly with
            // the audio, so the fill never jumps — 100 lands on finalize ('Done.').
            const progress = Math.min(5 + ((elapsed - startTime) / (session.exportEndTime - startTime)) * 94, 99);
            emit(Events.EXPORT_PROGRESS, { progress, message: `Recording… ${Math.round(progress)}%` });

            if (elapsed >= session.exportEndTime - 0.05) {
                clearInterval(session.progressInterval);
                session.progressInterval = null;
                stopRecording(session);
            }
        }, 200);

    } catch (error) {
        // cancelExport() may have torn down globals while an awaited setup
        // step was still pending. That stale run must not emit a second error
        // or proceed to start a recorder after the UI says it was cancelled.
        if (runId === exportRunId && state.isExporting) {
            abortExport(error.message || 'Unknown error occurred', session);
        }
    }
}

function stopRecording(session = active) {
    if (!session || active !== session) return;
    // Stop in BOTH 'recording' and 'paused' states — spec allows it, and our
    // visibility handler can leave the recorder paused. The 'stop' event then
    // fires recorder.onstop, which finalizes the blob and runs cleanup().
    if (session.recorder && (session.recorder.state === 'recording' || session.recorder.state === 'paused')) {
        try {
            session.recorder.stop();
        } catch {}
    }

    // Fallback: guarantee finalization even if the native 'stop' event never
    // fires (observed on some browsers). onstop is idempotent — guarded by
    // `session.finalized` — so it's safe if the native event also fires.
    setTimeout(() => {
        if (active === session && !session.finalized && typeof session.recorder?.onstop === 'function') session.recorder.onstop();
    }, 2000);
}

function cancelExport() {
    if (!state.isExporting) return;
    exportRunId += 1;
    // Block both the native 'stop' event and the stopRecording fallback from
    // emitting a (now unwanted) EXPORT_COMPLETE.
    active.finalized = true;
    if (active.recorder && (active.recorder.state === 'recording' || active.recorder.state === 'paused')) {
        active.recorder.onstop = null;
        try { active.recorder.stop(); } catch {}
    }
    cleanup();
    resumeMainAudioIfPaused();
    emit(Events.EXPORT_CANCELLED);
}

export function initExport() {
    initExportSupportModal();

    on(Events.EXPORT_REQUESTED, ({ audioFile, songTitle, artistName, rangeStart, rangeEnd }) => {
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

        startVideoRecording({ audioFile, songTitle, rangeStart, rangeEnd });
    });

    on(Events.DEBUG_BROWSER_SUPPORT, debugBrowserSupport);
    on(Events.EXPORT_CANCEL, cancelExport);
}
