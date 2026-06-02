import { emit, Events } from './lib/events.js';
import { DEFAULT_LYRICS_COLOR } from './lib/state.js';

const STORAGE_HISTORY = 'lyricsColorHistory';
const STORAGE_CURRENT = 'lyricsCurrentColor';
const MAX_HISTORY = 5;

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_HISTORY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter(c => typeof c === 'string' && c !== DEFAULT_LYRICS_COLOR)
            : [];
    } catch {
        return [];
    }
}

function loadCurrent() {
    try {
        return localStorage.getItem(STORAGE_CURRENT) || DEFAULT_LYRICS_COLOR;
    } catch {
        return DEFAULT_LYRICS_COLOR;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {}
}

function contrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

class ColorManager {
    constructor() {
        this.history = loadHistory();
        this.current = loadCurrent();

        this.picker = document.getElementById('lyrics-color-picker');
        this.preview = document.getElementById('color-preview');
        this.historyContainer = document.getElementById('color-history');
        this.copyBtn = document.getElementById('copy-hex-btn');
        this.historySection = document.querySelector('.color-history-section');

        this.picker.addEventListener('input', (e) => this.previewLive(e.target.value));
        this.picker.addEventListener('change', (e) => this.setColor(e.target.value));
        this.copyBtn.addEventListener('click', () => this.copyHex());

        this.renderPreview();
        this.renderHistory();
        this.broadcast();
    }

    setColor(color, addToHistory = true) {
        this.current = color;
        if (addToHistory && color !== DEFAULT_LYRICS_COLOR) {
            this.history = [color, ...this.history.filter(c => c !== color)].slice(0, MAX_HISTORY);
            save(STORAGE_HISTORY, JSON.stringify(this.history));
        }
        save(STORAGE_CURRENT, color);
        this.renderPreview();
        this.renderHistory();
        this.broadcast();
    }

    previewLive(color) {
        this.current = color;
        this.renderPreview();
        this.broadcast();
    }

    renderPreview() {
        this.preview.textContent = this.current.toUpperCase();
        this.preview.style.backgroundColor = this.current;
        this.preview.style.color = contrastColor(this.current);
        this.picker.value = this.current;
    }

    renderHistory() {
        this.historyContainer.replaceChildren();
        this.historySection.style.display = this.history.length === 0 ? 'none' : 'block';

        for (const color of this.history) {
            const swatch = document.createElement('div');
            swatch.className = 'color-history-item';
            swatch.style.backgroundColor = color;
            swatch.title = color.toUpperCase();
            swatch.addEventListener('click', () => this.setColor(color, false));
            this.historyContainer.appendChild(swatch);
        }
    }

    broadcast() {
        emit(Events.UPDATE_LYRICS_COLOR, this.current);
    }

    async copyHex() {
        const flash = () => {
            const icon = this.copyBtn.querySelector('.copy-icon');
            const original = icon.textContent;
            this.copyBtn.classList.add('copied');
            icon.textContent = '✓';
            setTimeout(() => {
                this.copyBtn.classList.remove('copied');
                icon.textContent = original;
            }, 2000);
        };

        try {
            await navigator.clipboard.writeText(this.current);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = this.current;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        flash();
    }

    getCurrent() {
        return this.current;
    }
}

export function initColorManager() {
    return new ColorManager();
}
