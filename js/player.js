import { on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { formatTime } from './lib/format.js';
import { updateAlbumArt, clearAlbumArt } from './album-art.js';
import { icon } from './icons.js';
import { toastError } from './toast.js';

const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
const repeatBtn = document.querySelector('.vinyl-repeat-btn');
const prevBtn = document.querySelector('.vinyl-prev-btn');
const nextBtn = document.querySelector('.vinyl-next-btn');
const shuffleBtn = document.querySelector('.vinyl-shuffle-btn');
const progressBar = document.querySelector('.vinyl-progress-bar');
const progressFill = document.querySelector('.vinyl-progress');
const currentTimeEl = document.querySelector('.vinyl-current-time');
const totalTimeEl = document.querySelector('.vinyl-total-time');
const lyricsTextEl = document.querySelector('.vinyl-lyrics-text');
const songTitleEl = document.querySelector('.vinyl-song-title');
const artistNameEl = document.querySelector('.vinyl-artist-name');
const stageHint = document.getElementById('stage-hint');

const ICON_PLAY  = icon('play',  { size: 24 });
const ICON_PAUSE = icon('pause', { size: 24 });

// ---------- Lyrics display ----------

function getCurrentLyric(time) {
    for (const lyric of state.lyrics) {
        if (time >= lyric.start && time < lyric.end) return lyric;
    }
    return null;
}

function renderLyrics() {
    if (!state.audioElement || !state.isPlaying) {
        lyricsTextEl.textContent = '';
        return;
    }
    const lyric = getCurrentLyric(state.currentTime);
    const next = lyric ? lyric.text : '';
    if (next === lyricsTextEl.textContent) return;
    if (!next) {
        lyricsTextEl.textContent = '';
        return;
    }
    lyricsTextEl.style.opacity = '0.4';
    setTimeout(() => {
        lyricsTextEl.textContent = next;
        lyricsTextEl.style.opacity = '1';
    }, 130);
}

function renderProgress() {
    if (state.totalTime > 0) {
        const percent = (state.currentTime / state.totalTime) * 100;
        progressFill.style.width = `${Math.min(percent, 100)}%`;
        progressBar.setAttribute('aria-valuenow', Math.round(percent));
    }
    currentTimeEl.textContent = formatTime(state.currentTime);
}

function renderPlayState() {
    vinyl.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
    tonearm.classList.toggle('playing', state.isPlaying);
    playPauseBtn.innerHTML = state.isPlaying ? ICON_PAUSE : ICON_PLAY;
    renderLyrics();
}

export function setPlayerPlaying(isPlaying) {
    state.isPlaying = isPlaying;
    renderPlayState();
}

function enableControls() {
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.disabled = false;
    });
    state.isRepeat = false;
    repeatBtn.classList.remove('active');
    shuffleBtn.classList.remove('active');
}

function restartAudio() {
    if (!state.audioElement) return;
    state.audioElement.currentTime = 0;
    state.currentTime = 0;
    renderProgress();

    setTimeout(() => {
        state.audioElement.play()
            .then(() => setPlayerPlaying(true))
            .catch(() => setPlayerPlaying(false));
    }, 100);
}

function togglePlayPause() {
    if (!state.audioElement) return;
    if (state.isPlaying) {
        state.audioElement.pause();
        setPlayerPlaying(false);
        return;
    }
    if (state.audioElement.ended) {
        restartAudio();
        return;
    }
    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch(() => setPlayerPlaying(false));
}

function startPlaying({ audioUrl, songTitle, artistName, albumArtUrl }) {
    if (state.audioElement) state.audioElement.pause();
    if (stageHint) stageHint.hidden = true;

    state.audioElement = new Audio(audioUrl);

    if (songTitle !== undefined) songTitleEl.textContent = songTitle || '';
    if (artistName !== undefined) artistNameEl.textContent = artistName || '';
    if (albumArtUrl) updateAlbumArt(albumArtUrl);

    enableControls();

    state.audioElement.addEventListener('loadedmetadata', () => {
        state.totalTime = Math.floor(state.audioElement.duration);
        totalTimeEl.textContent = formatTime(state.totalTime);
    });

    state.audioElement.addEventListener('timeupdate', () => {
        state.currentTime = state.audioElement.currentTime;
        renderProgress();
        renderLyrics();
    });

    state.audioElement.addEventListener('ended', () => {
        if (state.isRepeat) {
            state.audioElement.currentTime = 0;
            state.audioElement.play();
            return;
        }
        state.currentTime = 0;
        renderProgress();
        setPlayerPlaying(false);
    });

    state.audioElement.addEventListener('error', () => {
        toastError("Couldn't decode that audio file. Try MP3, WAV, OGG, or M4A.");
        setPlayerPlaying(false);
    });

    state.audioElement.play()
        .then(() => setPlayerPlaying(true))
        .catch((err) => {
            // Autoplay may be blocked until user gesture — that's not an error.
            if (err.name !== 'NotAllowedError') {
                toastError("Couldn't start playback. Click play to retry.");
            }
            setPlayerPlaying(false);
        });
    renderLyrics();
}

function stopPlayback() {
    if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement = null;
    }
    state.currentTime = 0;
    state.totalTime = 0;
    state.isPlaying = false;
    songTitleEl.textContent = '';
    artistNameEl.textContent = '';
    totalTimeEl.textContent = '00:00';
    progressFill.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
    document.querySelectorAll('.control-btn').forEach(btn => { btn.disabled = true; });
    if (stageHint) stageHint.hidden = false;

    // Full reset: hard-restart the animation so vinyl returns to 0° (paused).
    vinyl.style.animation = 'none';
    // Force reflow so the next assignment re-triggers the animation.
    void vinyl.offsetWidth;
    vinyl.style.animation = '';

    renderProgress();
    renderPlayState();
}

function setLyrics(newLyrics) {
    state.lyrics = (newLyrics || []).filter(l =>
        l &&
        typeof l.start !== 'undefined' &&
        typeof l.end !== 'undefined' &&
        typeof l.text === 'string' &&
        l.text.trim() !== ''
    );

    if (state.audioElement && state.isPlaying) {
        renderLyrics();
    } else {
        lyricsTextEl.textContent = '';
    }
}

function bindControls() {
    playPauseBtn.addEventListener('click', togglePlayPause);

    prevBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        state.audioElement.currentTime = 0;
        state.currentTime = 0;
        renderProgress();
    });

    nextBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        // Jump near the end so the 'ended' handler fires naturally — this respects repeat.
        state.audioElement.currentTime = Math.max(0, state.totalTime - 0.1);
    });

    shuffleBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        shuffleBtn.classList.toggle('active');
        // Visual-only — single-song app, no playlist to shuffle.
    });

    repeatBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        state.isRepeat = !state.isRepeat;
        repeatBtn.classList.toggle('active', state.isRepeat);
    });

    bindProgressScrub();
}

function bindProgressScrub() {
    let dragging = false;
    let wasPlaying = false;

    const seekTo = (clientX) => {
        if (!state.audioElement || !state.totalTime) return;
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = percent * state.totalTime;
        state.currentTime = newTime;
        state.audioElement.currentTime = newTime;
        renderProgress();
    };

    const onMove = (e) => {
        if (!dragging) return;
        e.preventDefault();
        seekTo(e.clientX);
    };

    const onUp = (e) => {
        if (!dragging) return;
        dragging = false;
        progressBar.removeAttribute('data-scrubbing');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (wasPlaying && state.audioElement && state.audioElement.paused) {
            state.audioElement.play().catch(() => {});
        }
    };

    progressBar.addEventListener('pointerdown', (e) => {
        if (!state.audioElement || !state.totalTime) return;
        e.preventDefault();
        dragging = true;
        wasPlaying = !state.audioElement.paused;
        progressBar.setAttribute('data-scrubbing', 'true');
        // Pause during scrub so audio doesn't stutter on rapid seeks
        if (wasPlaying) state.audioElement.pause();
        seekTo(e.clientX);
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    });
}

function bindShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in form fields
        const target = e.target;
        if (target.matches('input, textarea, [contenteditable="true"]')) return;
        if (e.key === ' ' && state.audioElement) {
            e.preventDefault();
            togglePlayPause();
        }
    });
}

export function initPlayer() {
    bindControls();
    bindShortcuts();
    renderProgress();
    renderPlayState();
    renderLyrics();

    on(Events.PLAY_FILE, startPlaying);
    on(Events.UPDATE_SONG_TITLE, (t) => { songTitleEl.textContent = t || ''; });
    on(Events.UPDATE_ARTIST_NAME, (a) => { artistNameEl.textContent = a || ''; });
    on(Events.UPDATE_ALBUM_ART, updateAlbumArt);
    on(Events.CLEAR_ALBUM_ART, clearAlbumArt);
    on(Events.STOP_PLAYBACK, stopPlayback);
    on(Events.UPDATE_LYRICS, setLyrics);
    on(Events.UPDATE_LYRICS_COLOR, (color) => {
        state.lyricsColor = color;
        lyricsTextEl.style.color = color;
    });
}
