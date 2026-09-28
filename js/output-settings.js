import { emit, Events } from './lib/events.js';
import {
    state,
    RATIOS,
    DEFAULT_ASPECT_RATIO,
    FORMATS,
    DEFAULT_VIDEO_FORMAT,
} from './lib/state.js';
import { toastInfo } from './toast.js';

function setAspectRatio(ratio, { persist = true } = {}) {
    if (!RATIOS[ratio]) return;
    // Mid-export the frame geometry is locked — the export computed its layer
    // rects at start; resizing the frame now would corrupt the video.
    if (state.isExporting) {
        toastInfo('Aspect ratio is locked while exporting.');
        return;
    }
    state.aspectRatio = ratio;
    const { w, h, label } = RATIOS[ratio];
    const [rw, rh] = ratio.split(':');

    document.querySelectorAll('.ratio-btn').forEach(btn => {
        const active = btn.dataset.ratio === ratio;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
    });

    const help = document.getElementById('ratio-help');
    if (help) help.textContent = `${w}×${h} · ${label}`;

    const frame = document.querySelector('.frame');
    if (frame) {
        frame.style.setProperty('--ratio-w', rw);
        frame.style.setProperty('--ratio-h', rh);
        frame.setAttribute('aria-label', `Video preview (${ratio}, ${w}×${h})`);
    }

    if (persist) {
        try { localStorage.setItem('aspectRatio', ratio); } catch {}
    }

    emit(Events.UPDATE_ASPECT_RATIO, ratio);
}

function loadPersistedRatio() {
    try {
        const saved = localStorage.getItem('aspectRatio');
        if (saved && RATIOS[saved]) return saved;
    } catch {}
    return DEFAULT_ASPECT_RATIO;
}

function formatSupported(fmt) {
    return !!window.MediaRecorder &&
        FORMATS[fmt].candidates.some(type => MediaRecorder.isTypeSupported(type));
}

function setVideoFormat(fmt, onFormatChanged, { persist = true } = {}) {
    if (!FORMATS[fmt]) return;
    // The recorder picked its mime type at start — switching now would lie
    // about what's being recorded.
    if (state.isExporting) {
        toastInfo('Video format is locked while exporting.');
        return;
    }
    state.videoFormat = fmt;

    document.querySelectorAll('.format-btn').forEach(btn => {
        const active = btn.dataset.format === fmt;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
    });

    const { ext, label } = FORMATS[fmt];
    const help = document.getElementById('format-help');
    if (help) help.textContent = `${ext.slice(1).toUpperCase()} · ${label}`;

    onFormatChanged();

    if (persist) {
        try { localStorage.setItem('videoFormat', fmt); } catch {}
    }
}

function loadPersistedFormat() {
    try {
        const saved = localStorage.getItem('videoFormat');
        if (saved && FORMATS[saved] && formatSupported(saved)) return saved;
    } catch {}
    return formatSupported('mp4') ? 'mp4' : DEFAULT_VIDEO_FORMAT;
}

export function initOutputSettings({ onFormatChanged }) {
    document.querySelectorAll('.ratio-btn[data-ratio]').forEach(btn => {
        btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio));
    });
    setAspectRatio(loadPersistedRatio(), { persist: false });

    document.querySelectorAll('.format-btn').forEach(btn => {
        const fmt = btn.dataset.format;
        if (!formatSupported(fmt)) {
            btn.disabled = true;
            btn.title = 'Not supported by this browser';
            return;
        }
        btn.addEventListener('click', () => setVideoFormat(fmt, onFormatChanged));
    });
    setVideoFormat(loadPersistedFormat(), onFormatChanged, { persist: false });
}
