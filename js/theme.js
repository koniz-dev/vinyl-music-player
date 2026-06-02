import { on, emit, Events } from './lib/events.js';
import { isOverridden } from './color-manager.js';

const FALLBACK = '#818cf8'; // indigo-400
const SAMPLE_SIZE = 32;

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToHex(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
        const k = (n + h * 12) % 12;
        const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}

async function extractAccent(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    const buckets = new Array(16).fill(0).map(() => ({ count: 0, s: 0, l: 0, h: 0 }));

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;
        const [h, s, l] = rgbToHsl(r, g, b);
        if (s < 0.25) continue;
        if (l < 0.15 || l > 0.85) continue;
        const bucket = buckets[Math.floor(h * 16) % 16];
        bucket.count += 1;
        bucket.s += s;
        bucket.l += l;
        bucket.h += h;
    }

    const winner = buckets
        .filter(b => b.count > 0)
        .sort((a, b) => (b.s * b.count) - (a.s * a.count))[0];

    if (!winner) return FALLBACK;

    let h = winner.h / winner.count;
    let s = Math.min(0.85, winner.s / winner.count + 0.15);
    let l = winner.l / winner.count;
    l = Math.max(0.55, Math.min(0.72, l));

    return hslToHex(h, s, l);
}

function applyAccent(hex) {
    const [r, g, b] = hexToRgb(hex);
    const hiH = hslToHex(...rgbToHsl(r, g, b).map((v, i) => i === 2 ? Math.min(0.85, v + 0.12) : v));
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-hi', hiH);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.35)`);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.12)`);
    emit(Events.ACCENT_DERIVED, hex);
}

function resetAccent() {
    applyAccent(FALLBACK);
}

let lastImageUrl = null;

async function deriveAndApply(imageUrl) {
    // Manual override wins — don't clobber user's chosen accent.
    if (isOverridden('accent')) return;
    if (!imageUrl) { resetAccent(); return; }
    try {
        const hex = await extractAccent(imageUrl);
        applyAccent(hex);
    } catch {
        resetAccent();
    }
}

export function initTheme() {
    resetAccent();

    on(Events.UPDATE_ALBUM_ART, (imageUrl) => {
        lastImageUrl = imageUrl;
        deriveAndApply(imageUrl);
    });

    // When user clears their accent override, re-derive from current album art.
    on(Events.ACCENT_OVERRIDE_CLEARED, () => {
        deriveAndApply(lastImageUrl);
    });
}
