import { emit, on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { icon } from './icons.js';

/* Each customizable element. Order = render order in drawer. */
const COLOR_DEFS = [
    {
        key: 'accent',
        label: 'Accent',
        cssVar: '--accent',                 // primary token; theme.js may auto-fill
        hasAuto: true,                       // accent can derive from album art
        defaultColor: '#818cf8',
        applyOverride: applyAccentOverride,
        applyReset: applyAccentReset,
    },
    {
        key: 'title',
        label: 'Title',
        cssVar: '--color-title',
        defaultColor: '#fafafa',
    },
    {
        key: 'artist',
        label: 'Artist',
        cssVar: '--color-artist',
        defaultColor: '#a1a1aa',
    },
    {
        key: 'lyrics',
        label: 'Lyrics',
        cssVar: '--color-lyrics',
        defaultColor: '#ffb3d1',
    },
    {
        key: 'bg',
        label: 'Background',
        cssVar: '--color-bg',
        defaultColor: '#09090b',
    },
    {
        key: 'vinyl',
        label: 'Vinyl tint',
        cssVar: '--color-vinyl-tint',
        defaultColor: 'transparent',     // CSS keyword — picker can't render this
        pickerDefault: '#404040',         // shown in <input type=color> when no override
        defaultLabel: 'None',
        valueToCssOverride: (hex) => hexToRgba(hex, 0.25),  // subtle overlay
    },
];

const STORAGE_KEY = 'colorOverrides';

// Map<key, hexString>. Only contains user-overridden keys.
let overrides = loadOverrides();
let listEl = null;

/* Public state queries — used by theme.js + export.js */
export function isOverridden(key) {
    return Object.prototype.hasOwnProperty.call(overrides, key);
}

export function getOverride(key) {
    return overrides[key];
}

// ───────────────────── Persistence ─────────────────────

function loadOverrides() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object') return {};
        // Keep only known keys with valid #rrggbb values. A corrupted entry
        // would otherwise throw inside init (hexToRgb / .toUpperCase) and take
        // the whole app boot sequence down with it.
        const clean = {};
        for (const [key, value] of Object.entries(parsed)) {
            if (COLOR_DEFS.some(d => d.key === key) && isHex(value)) {
                clean[key] = value;
            }
        }
        return clean;
    } catch {
        return {};
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {}
}

// ───────────────────── Color math helpers ─────────────────────

function hexToRgb(hex) {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    return [
        parseInt(h.slice(0, 2), 16) || 0,
        parseInt(h.slice(2, 4), 16) || 0,
        parseInt(h.slice(4, 6), 16) || 0,
    ];
}

function hexToRgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenHex(hex, amount) {
    const [r, g, b] = hexToRgb(hex);
    return '#' + [r, g, b]
        .map(c => Math.min(255, Math.round(c + (255 - c) * amount)).toString(16).padStart(2, '0'))
        .join('');
}

// ───────────────────── Accent custom hooks ─────────────────────

function applyAccentOverride(hex) {
    const hi = lightenHex(hex, 0.18);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-hi', hi);
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.35));
    document.documentElement.style.setProperty('--accent-soft', hexToRgba(hex, 0.12));
}

function applyAccentReset() {
    // Let theme.js decide based on current album art.
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-hi');
    document.documentElement.style.removeProperty('--accent-glow');
    document.documentElement.style.removeProperty('--accent-soft');
    emit(Events.ACCENT_OVERRIDE_CLEARED);
}

// ───────────────────── Apply / reset ─────────────────────

function applyOverride(def, hex) {
    if (def.applyOverride) {
        def.applyOverride(hex);
        return;
    }
    const cssValue = def.valueToCssOverride ? def.valueToCssOverride(hex) : hex;
    document.documentElement.style.setProperty(def.cssVar, cssValue);
    if (def.key === 'lyrics') {
        state.lyricsColor = hex;
        emit(Events.UPDATE_LYRICS_COLOR, hex);
    }
}

function applyReset(def) {
    if (def.applyReset) {
        def.applyReset();
        return;
    }
    document.documentElement.style.removeProperty(def.cssVar);
    if (def.key === 'lyrics') {
        state.lyricsColor = def.defaultColor;
        emit(Events.UPDATE_LYRICS_COLOR, def.defaultColor);
    }
}

function setColor(key, hex) {
    const def = COLOR_DEFS.find(d => d.key === key);
    if (!def) return;
    overrides[key] = hex;
    persist();
    applyOverride(def, hex);
    renderRow(def);
}

function resetColor(key) {
    const def = COLOR_DEFS.find(d => d.key === key);
    if (!def) return;
    delete overrides[key];
    persist();
    applyReset(def);
    renderRow(def);
}

// ───────────────────── Rendering ─────────────────────

function currentDisplayColor(def) {
    if (overrides[def.key]) return overrides[def.key];
    if (def.key === 'accent') {
        // Read live computed value (theme.js or default fallback)
        const cs = getComputedStyle(document.documentElement);
        return cs.getPropertyValue('--accent').trim() || def.defaultColor;
    }
    return def.defaultColor;
}

function isHex(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function renderRow(def) {
    const row = listEl.querySelector(`[data-color-key="${def.key}"]`);
    if (!row) return;

    const overrideHex = overrides[def.key];
    const isOverriddenNow = !!overrideHex;
    const isAuto = def.hasAuto && !isOverriddenNow;

    const swatch = row.querySelector('.color-row-swatch');
    const hexLabel = row.querySelector('.color-row-hex');

    // <input type="color"> only accepts #RRGGBB. Resolve a valid fallback chain.
    const liveHex = isOverriddenNow ? overrideHex : currentDisplayColor(def);
    const swatchHex = isHex(liveHex)
        ? liveHex
        : (def.pickerDefault || (isHex(def.defaultColor) ? def.defaultColor : '#888888'));
    swatch.value = swatchHex;

    row.dataset.auto = String(isAuto);
    row.dataset.overridden = String(isOverriddenNow);

    let display;
    if (isAuto) display = 'Auto · album art';
    else if (isOverriddenNow) display = overrideHex.toUpperCase();
    else if (isHex(def.defaultColor)) display = def.defaultColor.toUpperCase();
    else display = def.defaultLabel || 'Default';
    hexLabel.textContent = display;
}

function buildRow(def) {
    const row = document.createElement('div');
    row.className = 'color-row';
    row.dataset.colorKey = def.key;

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'color-row-swatch';
    swatch.setAttribute('aria-label', `Pick ${def.label} color`);
    swatch.addEventListener('input', (e) => setColor(def.key, e.target.value));

    const info = document.createElement('div');
    info.className = 'color-row-info';
    const label = document.createElement('div');
    label.className = 'color-row-label';
    label.textContent = def.label;
    const hexEl = document.createElement('div');
    hexEl.className = 'color-row-hex';
    info.append(label, hexEl);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'color-row-reset';
    resetBtn.setAttribute('aria-label', `Reset ${def.label}`);
    resetBtn.title = 'Reset to default';
    resetBtn.innerHTML = icon('rotate-ccw', { size: 13 });
    resetBtn.addEventListener('click', () => resetColor(def.key));

    row.append(swatch, info, resetBtn);
    return row;
}

// ───────────────────── Init ─────────────────────

export function initColorManager() {
    listEl = document.getElementById('color-list');
    if (!listEl) return;

    listEl.replaceChildren(...COLOR_DEFS.map(buildRow));

    // Apply persisted overrides + initial render
    for (const def of COLOR_DEFS) {
        if (overrides[def.key]) {
            applyOverride(def, overrides[def.key]);
        }
        renderRow(def);
    }

    // Re-render accent row when theme.js updates --accent from a new album art
    on(Events.ACCENT_DERIVED, () => {
        const def = COLOR_DEFS.find(d => d.key === 'accent');
        if (def) renderRow(def);
    });
}
