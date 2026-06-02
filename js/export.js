import { emit, on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { setPlayerPlaying } from './player.js';

const EXPORT_TIMEOUT_MS = 5 * 60 * 1000;

let canvas = null;
let ctx = null;
let recorder = null;
let recordedChunks = [];
let animationId = null;
let timeoutId = null;
let progressInterval = null;
let exportAudio = null;
let albumArtImage = null;
let exportLyrics = [];
let vinylRotation = 0;
let wasMainAudioPlaying = false;

function createCanvas() {
    canvas = document.createElement('canvas');

    let width = 720;
    let height = 1280;

    const probeRect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { width: r.width, height: r.height } : null;
    };

    const fallbackFromWindow = () => {
        const ww = window.innerWidth;
        const wh = window.innerHeight;
        if (!(ww > 0 && wh > 0)) return null;
        const aspect = 9 / 16;
        return ww / wh > aspect
            ? { width: wh * aspect, height: wh }
            : { width: ww, height: ww / aspect };
    };

    const dims = probeRect(document.querySelector('.vinyl-player'))
        || probeRect(window.frameElement)
        || fallbackFromWindow();

    if (dims) {
        width = dims.width;
        height = dims.height;
    }

    canvas.width = Math.max(width, 400);
    canvas.height = Math.max(height, 600);

    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
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
        btn.style.opacity = disabled ? '0.5' : '1';
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
}

function cleanup() {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if (exportAudio) { exportAudio.pause(); exportAudio = null; }
    if (albumArtImage) { URL.revokeObjectURL(albumArtImage.src); albumArtImage = null; }
    disableControls(false);
    state.isExporting = false;
}

function resumeMainAudioIfPaused() {
    if (!wasMainAudioPlaying || !state.audioElement) return;
    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch(() => {});
}

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

        emit(Events.EXPORT_PROGRESS, { progress: 5, message: 'Initializing export...' });

        createCanvas();

        if (albumArtFile) {
            emit(Events.EXPORT_PROGRESS, { progress: 15, message: 'Loading album art...' });
            albumArtImage = new Image();
            albumArtImage.src = URL.createObjectURL(albumArtFile);
            await new Promise((resolve) => { albumArtImage.onload = resolve; });
        }

        emit(Events.EXPORT_PROGRESS, { progress: 15, message: 'Loading audio...' });

        const audioUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioUrl);
        exportLyrics = [...state.lyrics];

        await new Promise((resolve, reject) => {
            exportAudio.addEventListener('loadedmetadata', resolve);
            exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        const canvasStream = canvas.captureStream(30);
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(exportAudio);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);

        const combined = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks(),
        ]);

        const mimeType = pickMimeType();
        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Setting up video recorder with audio...' });

        recorder = new MediaRecorder(combined, { mimeType });
        recordedChunks = [];

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        recorder.onstop = () => {
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

            const videoBlob = new Blob(recordedChunks, { type: mimeType });
            const fileName = `${songTitle.replace(/[<>:"/\\|?*]/g, '')}.webm`;

            emit(Events.EXPORT_PROGRESS, { progress: 100, message: 'WebM export complete!' });
            emit(Events.EXPORT_COMPLETE, { videoBlob, fileName });

            resumeMainAudioIfPaused();
            disableControls(false);
            state.isExporting = false;
        };

        emit(Events.EXPORT_PROGRESS, { progress: 20, message: 'Starting recording...' });
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
            emit(Events.EXPORT_PROGRESS, { progress, message: `Recording... ${Math.round(progress)}%` });
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
    state.isExporting = false;
}

function debugBrowserSupport() {
    const support = {
        mediaRecorder: !!window.MediaRecorder,
        canvas: !!document.createElement('canvas').getContext,
        audio: !!window.Audio,
        webm: MediaRecorder.isTypeSupported('video/webm'),
        webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
    };

    const tick = (b) => b ? '✅' : '❌';
    alert([
        'Browser Support Check:',
        '',
        `MediaRecorder: ${tick(support.mediaRecorder)}`,
        `Canvas: ${tick(support.canvas)}`,
        `Audio: ${tick(support.audio)}`,
        `WebM: ${tick(support.webm)}`,
        `WebM VP8: ${tick(support.webm_vp8)}`,
        `WebM VP9: ${tick(support.webm_vp9)}`,
        `Browser: ${navigator.userAgent.split(' ')[0]}`,
    ].join('\n'));
}

// ---------- Render pipeline (pixel-identical to previous version) ----------

function drawRoundedRectPath(x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
}

function renderToCanvas() {
    if (!ctx) return;

    vinylRotation += 0.3;

    const bodyGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bodyGradient.addColorStop(0, '#667eea');
    bodyGradient.addColorStop(0.25, '#764ba2');
    bodyGradient.addColorStop(0.5, '#f093fb');
    bodyGradient.addColorStop(0.75, '#f5576c');
    bodyGradient.addColorStop(1, '#4facfe');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const musicPlayerWidth = Math.min(canvas.width * 0.9, 350);
    const musicPlayerHeight = Math.min(canvas.height * 0.9, 600);
    const musicPlayerX = (canvas.width - musicPlayerWidth) / 2;
    const musicPlayerY = (canvas.height - musicPlayerHeight) / 2;

    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight, 30);
    ctx.clip();

    if (albumArtImage) {
        const imgAspect = albumArtImage.width / albumArtImage.height;
        const playerAspect = musicPlayerWidth / musicPlayerHeight;
        let drawWidth, drawHeight, offsetX, offsetY;
        if (imgAspect > playerAspect) {
            drawHeight = musicPlayerHeight;
            drawWidth = drawHeight * imgAspect;
            offsetX = musicPlayerX + (musicPlayerWidth - drawWidth) / 2;
            offsetY = musicPlayerY;
        } else {
            drawWidth = musicPlayerWidth;
            drawHeight = drawWidth / imgAspect;
            offsetX = musicPlayerX;
            offsetY = musicPlayerY + (musicPlayerHeight - drawHeight) / 2;
        }
        ctx.drawImage(albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
    ctx.restore();

    const vinylSectionHeight = musicPlayerHeight * 0.7;
    const vinylContainerWidth = 200;
    const vinylContainerHeight = 200;
    const vinylContainerX = musicPlayerX + (musicPlayerWidth - vinylContainerWidth) / 2;
    const vinylContainerY = musicPlayerY + (vinylSectionHeight - vinylContainerHeight) / 2 - 20;
    const centerX = vinylContainerX + vinylContainerWidth / 2;
    const centerY = vinylContainerY + vinylContainerHeight / 2;
    const vinylRadius = vinylContainerWidth / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((vinylRotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    const vinylGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
    vinylGradient.addColorStop(0, '#2a2a2a');
    vinylGradient.addColorStop(0.2, '#2a2a2a');
    vinylGradient.addColorStop(0.4, '#1a1a1a');
    vinylGradient.addColorStop(0.8, '#000000');
    vinylGradient.addColorStop(1, '#000000');
    ctx.fillStyle = vinylGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((vinylRotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    for (const factor of [0.8, 0.68, 0.56]) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, vinylRadius * factor, 0, 2 * Math.PI);
        ctx.stroke();
    }
    ctx.restore();

    const centerRadius = vinylRadius * 0.48;
    const centerGradient = ctx.createLinearGradient(
        centerX - centerRadius, centerY - centerRadius,
        centerX + centerRadius, centerY + centerRadius
    );
    centerGradient.addColorStop(0, '#667eea');
    centerGradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fill();

    const highlight = ctx.createRadialGradient(
        centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0,
        centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8
    );
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fill();

    const albumArtRadius = centerRadius * 0.83;
    if (albumArtImage) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((vinylRotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius,
                      albumArtRadius * 2, albumArtRadius * 2);
        ctx.restore();
        ctx.restore();
    } else {
        const fallback = new Image();
        fallback.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)"/><path d="M30 40 Q35 35 40 40 L45 50 Q50 45 55 50 L60 60 Q55 65 50 60 L45 50 Q40 55 35 50 Z" fill="white" opacity="0.8"/></svg>';
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((vinylRotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(fallback, centerX - albumArtRadius, centerY - albumArtRadius,
                      albumArtRadius * 2, albumArtRadius * 2);
        ctx.restore();
    }

    const tonearmX = vinylContainerX + vinylContainerWidth - 16;
    const tonearmY = vinylContainerY + 16;
    const tonearmLength = 96;
    ctx.save();
    ctx.translate(tonearmX, tonearmY);
    ctx.rotate(25 * Math.PI / 180);
    const tonearmGradient = ctx.createLinearGradient(0, 0, 0, tonearmLength);
    tonearmGradient.addColorStop(0, '#fff');
    tonearmGradient.addColorStop(1, '#ccc');
    ctx.fillStyle = tonearmGradient;
    ctx.fillRect(-1.5, 0, 3, tonearmLength);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-1.5, 0, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.fillRect(-2, tonearmLength - 5, 6, 10);
    ctx.restore();

    const songInfoX = musicPlayerX;
    const songInfoY = vinylContainerY + vinylContainerHeight + 40;
    const songInfoWidth = musicPlayerWidth;

    const songTitleText = document.querySelector('.vinyl-song-title').textContent;
    const artistText = document.querySelector('.vinyl-artist-name').textContent;
    const liveLyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(songTitleText, songInfoX + songInfoWidth / 2, songInfoY);

    if (artistText) {
        ctx.font = `16px 'Patrick Hand', Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(artistText, songInfoX + songInfoWidth / 2, songInfoY + 25);
    }

    if (exportAudio && exportLyrics.length > 0) {
        const t = exportAudio.currentTime;
        const lyric = exportLyrics.find(l => t >= l.start && t <= l.end);
        if (lyric) {
            ctx.font = `20px 'Patrick Hand', Arial, sans-serif`;
            ctx.fillStyle = state.lyricsColor;
            ctx.fillText(lyric.text, songInfoX + songInfoWidth / 2, songInfoY + 60);
        }
    } else if (liveLyricsText) {
        ctx.font = `20px 'Patrick Hand', Arial, sans-serif`;
        ctx.fillStyle = state.lyricsColor;
        ctx.fillText(liveLyricsText, songInfoX + songInfoWidth / 2, songInfoY + 60);
    }

    const progressContainerY = songInfoY + 80;
    const progressBarWidth = musicPlayerWidth - 60;
    const progressBarHeight = 4;
    const progressBarX = musicPlayerX + 30;
    const progressBarY = progressContainerY + 10;
    const barRadius = 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(progressBarX, progressBarY, progressBarWidth, progressBarHeight, barRadius);
    ctx.fill();
    ctx.restore();

    let progressPercent = 0;
    if (exportAudio && exportAudio.readyState >= 2 &&
        !isNaN(exportAudio.currentTime) && !isNaN(exportAudio.duration) &&
        exportAudio.duration > 0) {
        progressPercent = Math.min(exportAudio.currentTime / exportAudio.duration, 1);
    }
    const progressWidth = progressBarWidth * progressPercent;
    const progressGradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
    progressGradient.addColorStop(0, '#667eea');
    progressGradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = progressGradient;
    ctx.save();
    ctx.beginPath();
    drawRoundedRectPath(progressBarX, progressBarY, progressWidth, progressBarHeight, barRadius);
    ctx.fill();
    ctx.restore();

    const thumbX = progressBarX + progressWidth;
    const thumbY = progressBarY + progressBarHeight / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = `12px 'Patrick Hand', Arial, sans-serif`;

    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };
    const cur = exportAudio && !isNaN(exportAudio.currentTime) ? exportAudio.currentTime : 0;
    const tot = exportAudio && !isNaN(exportAudio.duration) ? exportAudio.duration : 0;
    ctx.textAlign = 'left';
    ctx.fillText(fmt(cur), progressBarX, progressBarY + 20);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(tot), progressBarX + progressBarWidth, progressBarY + 20);

    const controlsHeight = 80;
    const controlsY = progressContainerY + 50 - 20;
    const buttonSize = 45;
    const playButtonSize = 70;
    const availableWidth = musicPlayerWidth - 60;
    const totalButtonWidth = 4 * buttonSize + playButtonSize;
    const buttonSpacing = (availableWidth - totalButtonWidth) / 4;
    const startButtonX = musicPlayerX + 30;
    const buttonY = controlsY + (controlsHeight - playButtonSize) / 2;
    const playIcon = (exportAudio && !exportAudio.paused) ? '⏸' : '▶';
    const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];

    let cursorX = startButtonX;
    for (let i = 0; i < 5; i++) {
        const isPlay = i === 2;
        const size = isPlay ? playButtonSize : buttonSize;
        const cx = cursorX + size / 2;
        const cy = buttonY + playButtonSize / 2;
        ctx.fillStyle = isPlay ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = isPlay ? `28px Arial` : `${size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(buttonIcons[i], cx, cy);
        cursorX += size + buttonSpacing;
    }
}

export function initExport() {
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
}
