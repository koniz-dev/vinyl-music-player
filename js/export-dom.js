import { icon } from './icons.js';
import { formatTime } from './lib/format.js';

const PAUSE_ICON_HTML = icon('pause', { size: 24 });

// The exporter captures the live player frame. Keep the temporary DOM state
// isolated here so recording lifecycle code has no knowledge of individual UI
// nodes or how they are restored.
export function snapshotExportDom() {
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

export function applyExportDomState(bindings) {
    bindings.vinyl.style.animationName = 'none';
    bindings.vinyl.style.transform = 'rotate(0deg)';
    bindings.tonearm.classList.add('playing');
    bindings.playBtn.innerHTML = PAUSE_ICON_HTML;
    bindings.frame.dataset.exporting = 'true';
}

export function restoreExportDom(bindings, isPlaying) {
    if (!bindings) return;
    bindings.vinyl.style.animation = bindings.prevAnimation;
    bindings.vinyl.style.animationPlayState = bindings.prevAnimationPlayState
        || (isPlaying ? 'running' : 'paused');
    bindings.vinyl.style.transform = bindings.prevTransform;
    bindings.tonearm.style.transform = bindings.prevTonearmTransform;
    bindings.tonearm.classList.toggle('playing', bindings.prevTonearmPlaying);
    bindings.playBtn.innerHTML = bindings.prevPlayBtnHtml;
    bindings.frame.dataset.exporting = 'false';
    bindings.lyricsEl.textContent = bindings.prevLyrics;
    bindings.progressEl.style.width = bindings.prevProgressWidth;
    bindings.curEl.textContent = bindings.prevCur;
    bindings.totEl.textContent = bindings.prevTot;
}

export function syncExportDom(bindings, audio, lyrics, spinPeriodSeconds) {
    if (!audio) return;
    const time = audio.currentTime;
    const duration = audio.duration;
    bindings.vinyl.style.transform = `rotate(${(time / spinPeriodSeconds) * 360}deg)`;

    const current = lyrics.find(line => time >= line.start && time < line.end);
    const lyricText = current ? [current.text, current.translation].filter(Boolean).join('\n') : '';
    if (lyricText !== bindings.lyricsEl.textContent) bindings.lyricsEl.textContent = lyricText;

    if (duration > 0) bindings.progressEl.style.width = `${Math.min(time / duration * 100, 100)}%`;
    bindings.curEl.textContent = formatTime(time);
    bindings.totEl.textContent = formatTime(duration);
}
