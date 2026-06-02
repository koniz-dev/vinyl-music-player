import { on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { formatTime } from './lib/format.js';
import { updateAlbumArt } from './album-art.js';

const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
const muteBtn = document.querySelector('.vinyl-mute-btn');
const repeatBtn = document.querySelector('.vinyl-repeat-btn');
const progressBar = document.querySelector('.vinyl-progress-bar');
const progressFill = document.querySelector('.vinyl-progress');
const currentTimeEl = document.querySelector('.vinyl-current-time');
const totalTimeEl = document.querySelector('.vinyl-total-time');
const lyricsTextEl = document.querySelector('.vinyl-lyrics-text');
const songTitleEl = document.querySelector('.vinyl-song-title');
const artistNameEl = document.querySelector('.vinyl-artist-name');

// ---------- Inline SVG icons ----------

const ICONS = {
    play: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    pause: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    volume: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    muted: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
};

function setHTML(el, html) {
    el.innerHTML = html;
}

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
    if (state.isPlaying) {
        vinyl.style.animation = 'spin 8s linear infinite';
        tonearm.classList.add('playing');
        setHTML(playPauseBtn, ICONS.pause);
    } else {
        vinyl.style.animation = 'none';
        tonearm.classList.remove('playing');
        setHTML(playPauseBtn, ICONS.play);
    }
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
    state.isMuted = false;
    setHTML(muteBtn, ICONS.volume);
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

    state.audioElement = new Audio(audioUrl);

    if (songTitle !== undefined) songTitleEl.textContent = songTitle || 'Untitled';
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

    state.audioElement.play().then(() => setPlayerPlaying(true));
    renderLyrics();
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

    muteBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        state.isMuted = !state.isMuted;
        state.audioElement.muted = state.isMuted;
        setHTML(muteBtn, state.isMuted ? ICONS.muted : ICONS.volume);
    });

    repeatBtn.addEventListener('click', () => {
        if (!state.audioElement) return;
        state.isRepeat = !state.isRepeat;
        repeatBtn.classList.toggle('active', state.isRepeat);
    });

    let seeking = false;
    progressBar.addEventListener('click', (e) => {
        if (seeking || !state.audioElement) return;
        seeking = true;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = Math.floor(percent * state.totalTime);
        state.currentTime = newTime;
        state.audioElement.currentTime = newTime;
        renderProgress();
        setTimeout(() => { seeking = false; }, 100);
    });
}

export function initPlayer() {
    bindControls();
    renderProgress();
    renderPlayState();
    renderLyrics();

    on(Events.PLAY_FILE, startPlaying);
    on(Events.UPDATE_SONG_TITLE, (t) => { songTitleEl.textContent = t || 'Untitled'; });
    on(Events.UPDATE_ARTIST_NAME, (a) => { artistNameEl.textContent = a || ''; });
    on(Events.UPDATE_ALBUM_ART, updateAlbumArt);
    on(Events.UPDATE_LYRICS, setLyrics);
    on(Events.UPDATE_LYRICS_COLOR, (color) => {
        state.lyricsColor = color;
        lyricsTextEl.style.color = color;
    });
}
