import { emit, on, Events } from './lib/events.js';
import { state } from './lib/state.js';
import { icon } from './icons.js';

/* Each customizable element. Order = render order in drawer.
   `presets` = curated quick-pick swatches tuned to the element's role
   (dark tones for bg, light for title, pastels for lyrics…), so users who
   aren't confident with color theory still land on something harmonious. */
const COLOR_DEFS = [
    {
        key: 'accent',
        label: 'Accent',
        cssVar: '--accent',                 // primary token; theme.js may auto-fill
        hasAuto: true,                       // accent can derive from album art
        defaultColor: '#818cf8',
        applyOverride: applyAccentOverride,
        applyReset: applyAccentReset,
        presets: ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fb923c', '#fbbf24', '#34d399', '#22d3ee'],
    },
    {
        key: 'title',
        label: 'Title',
        cssVar: '--color-title',
        defaultColor: '#fafafa',
        presets: ['#fafafa', '#f5f5f4', '#fef3c7', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa'],
    },
    {
        key: 'artist',
        label: 'Artist',
        cssVar: '--color-artist',
        defaultColor: '#a1a1aa',
        presets: ['#a1a1aa', '#d4d4d8', '#fda4af', '#93c5fd', '#6ee7b7', '#fcd34d', '#c4b5fd', '#fdba74'],
    },
    {
        key: 'lyrics',
        label: 'Lyrics',
        cssVar: '--color-lyrics',
        defaultColor: '#ffb3d1',
        presets: ['#ffb3d1', '#fde68a', '#a5f3fc', '#bbf7d0', '#c7d2fe', '#fdba74', '#f0abfc', '#fca5a5'],
    },
    {
        key: 'bg',
        label: 'Background',
        cssVar: '--color-bg',
        defaultColor: '#09090b',
        presets: ['#09090b', '#18181b', '#0d0b1a', '#0c1929', '#051c26', '#160a0f', '#07150e', '#1f1409'],
    },
    {
        key: 'vinyl',
        label: 'Vinyl tint',
        cssVar: '--color-vinyl-tint',
        defaultColor: 'transparent',     // CSS keyword — picker can't render this
        pickerDefault: '#404040',         // shown in <input type=color> when no override
        defaultLabel: 'None',
        valueToCssOverride: (hex) => hexToRgba(hex, 0.25),  // subtle overlay
        presets: ['#404040', '#818cf8', '#f472b6', '#fb923c', '#fbbf24', '#34d399', '#22d3ee', '#a78bfa'],
    },
];

/* One-tap color schemes built on classic harmony rules (monochrome,
   analogous, complementary, triadic) so the whole frame stays coordinated.
   `colors: null` = the reset chip (back to defaults / auto accent). */
const PALETTES = [
    { key: 'default', name: 'Default', scheme: 'Auto accent', colors: null },
    {
        key: 'indigo-haze', name: 'Indigo Haze', scheme: 'Monochrome',
        colors: { accent: '#818cf8', title: '#f5f3ff', artist: '#a5b4fc', lyrics: '#c4b5fd', bg: '#0d0b1a', vinyl: '#4338ca' },
    },
    {
        key: 'sunset-glow', name: 'Sunset Glow', scheme: 'Complementary',
        colors: { accent: '#fb923c', title: '#fff7ed', artist: '#93a8c4', lyrics: '#fed7aa', bg: '#0c1929', vinyl: '#f97316' },
    },
    {
        key: 'ocean-drift', name: 'Ocean Drift', scheme: 'Analogous',
        colors: { accent: '#22d3ee', title: '#ecfeff', artist: '#67e8f9', lyrics: '#a5f3fc', bg: '#051c26', vinyl: '#0e7490' },
    },
    {
        key: 'rose-noir', name: 'Rose Noir', scheme: 'Monochrome',
        colors: { accent: '#fb7185', title: '#fff1f2', artist: '#fda4af', lyrics: '#fecdd3', bg: '#160a0f', vinyl: '#be123c' },
    },
    {
        key: 'forest-cream', name: 'Forest Cream', scheme: 'Complementary',
        colors: { accent: '#34d399', title: '#f0fdf4', artist: '#86efac', lyrics: '#fde68a', bg: '#07150e', vinyl: '#059669' },
    },
    {
        key: 'neon-pop', name: 'Neon Pop', scheme: 'Triadic',
        colors: { accent: '#e879f9', title: '#fdf4ff', artist: '#22d3ee', lyrics: '#fde047', bg: '#120321', vinyl: '#c026d3' },
    },
    {
        key: 'mono-chic', name: 'Mono Chic', scheme: 'Grayscale',
        colors: { accent: '#d4d4d8', title: '#fafafa', artist: '#a1a1aa', lyrics: '#e4e4e7', bg: '#09090b', vinyl: '#525252' },
    },
];

const STORAGE_KEY = 'colorOverrides';

// Map<key, hexString>. Only contains user-overridden keys.
let overrides = loadOverrides();
let listEl = null;
let paletteListEl = null;

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
    renderPaletteActive();
}

function resetColor(key) {
    const def = COLOR_DEFS.find(d => d.key === key);
    if (!def) return;
    delete overrides[key];
    persist();
    applyReset(def);
    renderRow(def);
    renderPaletteActive();
}

function applyPalette(palette) {
    if (!palette.colors) {
        COLOR_DEFS.forEach(d => resetColor(d.key));
        return;
    }
    for (const [key, hex] of Object.entries(palette.colors)) {
        setColor(key, hex);
    }
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
    hexLabel.title = display;   // full value survives the ellipsis

    // Highlight the preset dot matching the current override (if any).
    row.querySelectorAll('.color-preset-dot').forEach(dot => {
        dot.classList.toggle('active',
            !!overrideHex && dot.dataset.hex.toLowerCase() === overrideHex.toLowerCase());
    });
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

    // Quick-pick presets, collapsed behind a chevron so the grid stays compact.
    if (def.presets && def.presets.length) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'color-row-presets-toggle';
        toggleBtn.setAttribute('aria-label', `Show ${def.label} preset colors`);
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.title = 'Preset colors';
        toggleBtn.innerHTML = icon('chevron-down', { size: 14 });
        toggleBtn.addEventListener('click', () => {
            const open = row.dataset.presetsOpen === 'true';
            row.dataset.presetsOpen = String(!open);
            toggleBtn.setAttribute('aria-expanded', String(!open));
        });

        const strip = document.createElement('div');
        strip.className = 'color-row-presets';
        for (const hex of def.presets) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'color-preset-dot';
            dot.dataset.hex = hex;
            dot.style.background = hex;
            dot.setAttribute('aria-label', `${def.label} ${hex}`);
            dot.title = hex.toUpperCase();
            dot.addEventListener('click', () => setColor(def.key, hex));
            strip.appendChild(dot);
        }

        row.append(toggleBtn, strip);
    }

    return row;
}

// ───────────────────── Palette templates ─────────────────────

function paletteIsActive(palette) {
    if (!palette.colors) return Object.keys(overrides).length === 0;
    const entries = Object.entries(palette.colors);
    return entries.every(([key, hex]) =>
        (overrides[key] || '').toLowerCase() === hex.toLowerCase()
    ) && Object.keys(overrides).length === entries.length;
}

function renderPaletteActive() {
    if (!paletteListEl) return;
    paletteListEl.querySelectorAll('.palette-chip').forEach(chip => {
        const palette = PALETTES.find(p => p.key === chip.dataset.paletteKey);
        chip.classList.toggle('active', !!palette && paletteIsActive(palette));
    });
}

function buildPaletteChip(palette) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'palette-chip';
    chip.dataset.paletteKey = palette.key;
    chip.setAttribute('aria-label', `Apply ${palette.name} palette`);

    const dots = document.createElement('span');
    dots.className = 'palette-chip-dots';
    // Mini preview: bg as the backdrop, accent/lyrics/title as dots.
    const colors = palette.colors || {
        bg: '#09090b', accent: '#818cf8', lyrics: '#ffb3d1', title: '#fafafa',
    };
    dots.style.background = colors.bg;
    for (const key of ['accent', 'lyrics', 'title']) {
        const dot = document.createElement('span');
        dot.className = 'palette-chip-dot';
        dot.style.background = colors[key];
        dots.appendChild(dot);
    }

    const info = document.createElement('span');
    info.className = 'palette-chip-info';
    const name = document.createElement('span');
    name.className = 'palette-chip-name';
    name.textContent = palette.name;
    const scheme = document.createElement('span');
    scheme.className = 'palette-chip-scheme';
    scheme.textContent = palette.scheme;
    info.append(name, scheme);

    chip.append(dots, info);
    chip.addEventListener('click', () => applyPalette(palette));
    return chip;
}

// ───────────────────── Init ─────────────────────

export function initColorManager() {
    listEl = document.getElementById('color-list');
    if (!listEl) return;

    listEl.replaceChildren(...COLOR_DEFS.map(buildRow));

    paletteListEl = document.getElementById('palette-list');
    if (paletteListEl) {
        paletteListEl.replaceChildren(...PALETTES.map(buildPaletteChip));
    }

    // Apply persisted overrides + initial render
    for (const def of COLOR_DEFS) {
        if (overrides[def.key]) {
            applyOverride(def, overrides[def.key]);
        }
        renderRow(def);
    }
    renderPaletteActive();

    // Re-render accent row when theme.js updates --accent from a new album art
    on(Events.ACCENT_DERIVED, () => {
        const def = COLOR_DEFS.find(d => d.key === 'accent');
        if (def) renderRow(def);
    });
}
