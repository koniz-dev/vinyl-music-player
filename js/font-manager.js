/* Player typography — a curated set of popular Google Fonts (every family
 * here ships a Vietnamese subset) applied to the frame's title/artist/lyrics
 * via the --font-player token. Helper of settings.js like color-manager —
 * no bus events; the player picks the change up straight from the CSS var.
 *
 * Export: html-to-image rasterizes the frame inside an isolated SVG image
 * document, where the page's webfonts are NOT available. getFontEmbedCss()
 * builds a self-contained @font-face CSS string (woff2 → data: URLs) for the
 * selected family that export.js passes to each base capture. The default
 * font keeps today's skipFonts behavior (system-ui fallback ≈ Inter).
 */

const DEFAULT_KEY = 'inter';

/* `cssParam` mirrors the css2 URL fragment in index.html's stylesheet link —
   weights 400/500/700 cover artist/lyrics/title. Single-style families
   (Pacifico, Patrick Hand) take no wght axis. */
const FONT_DEFS = [
    { key: 'inter',            label: 'Inter',            category: 'Sans-serif',  stack: "'Inter', system-ui, -apple-system, sans-serif", cssParam: 'Inter:wght@400;500;600;700' },
    { key: 'be-vietnam-pro',   label: 'Be Vietnam Pro',   category: 'Sans-serif',  stack: "'Be Vietnam Pro', system-ui, sans-serif",       cssParam: 'Be+Vietnam+Pro:wght@400;500;700' },
    { key: 'montserrat',       label: 'Montserrat',       category: 'Sans-serif',  stack: "'Montserrat', system-ui, sans-serif",           cssParam: 'Montserrat:wght@400;500;700' },
    { key: 'playfair-display', label: 'Playfair Display', category: 'Serif',       stack: "'Playfair Display', Georgia, serif",            cssParam: 'Playfair+Display:wght@400;500;700' },
    { key: 'lora',             label: 'Lora',             category: 'Serif',       stack: "'Lora', Georgia, serif",                        cssParam: 'Lora:wght@400;500;700' },
    { key: 'oswald',           label: 'Oswald',           category: 'Display',     stack: "'Oswald', system-ui, sans-serif",               cssParam: 'Oswald:wght@400;500;700' },
    { key: 'dancing-script',   label: 'Dancing Script',   category: 'Script',      stack: "'Dancing Script', cursive",                     cssParam: 'Dancing+Script:wght@400;500;700' },
    { key: 'pacifico',         label: 'Pacifico',         category: 'Script',      stack: "'Pacifico', cursive",                           cssParam: 'Pacifico' },
    { key: 'patrick-hand',     label: 'Patrick Hand',     category: 'Handwritten', stack: "'Patrick Hand', cursive",                       cssParam: 'Patrick+Hand' },
];

const STORAGE_KEY = 'playerFont';
// Only embed the subsets the player actually renders — dropping cyrillic/greek
// keeps the per-second base-capture SVG payload small.
const EMBED_SUBSETS = new Set(['latin', 'latin-ext', 'vietnamese']);

let currentKey = loadPersistedFont();
let listEl = null;
// Map<fontKey, Promise<string|null>> — embed CSS is built once per family.
const embedCssCache = new Map();

// ───────────────────── Persistence ─────────────────────

function loadPersistedFont() {
    try {
        const key = localStorage.getItem(STORAGE_KEY);
        return FONT_DEFS.some(f => f.key === key) ? key : DEFAULT_KEY;
    } catch {
        return DEFAULT_KEY;
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, currentKey);
    } catch {}
}

// ───────────────────── Apply / select ─────────────────────

function applyFont(def) {
    if (def.key === DEFAULT_KEY) {
        document.documentElement.style.removeProperty('--font-player');
    } else {
        document.documentElement.style.setProperty('--font-player', def.stack);
    }
}

function setFont(key) {
    const def = FONT_DEFS.find(f => f.key === key);
    if (!def) return;
    currentKey = def.key;
    persist();
    applyFont(def);
    renderActive();
}

// ───────────────────── Export font embedding ─────────────────────

async function inlineFontUrls(cssText) {
    const urls = [...new Set(
        [...cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1])
    )];
    const pairs = await Promise.all(urls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error('font-fetch-failed');
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('font-read-failed'));
            reader.readAsDataURL(blob);
        });
        return [url, dataUrl];
    }));
    let out = cssText;
    for (const [url, dataUrl] of pairs) {
        out = out.split(url).join(dataUrl);
    }
    return out;
}

// css2 responses label each @font-face block with a `/* subset */` comment.
function filterSubsets(cssText) {
    const parts = cssText.split(/\/\*\s*([a-z0-9-]+)\s*\*\//);
    if (parts.length < 3) return cssText;   // unexpected shape — keep everything
    let out = '';
    for (let i = 1; i < parts.length; i += 2) {
        if (EMBED_SUBSETS.has(parts[i])) out += parts[i + 1];
    }
    return out || cssText;
}

async function buildEmbedCss(def) {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${def.cssParam}&display=swap`);
    if (!res.ok) return null;
    return inlineFontUrls(filterSubsets(await res.text()));
}

/* Self-contained @font-face CSS for the selected family, or null for the
 * default font / on failure (export then falls back to skipFonts — same as
 * today). Cached per family; a failed build is retried on the next call. */
export async function getFontEmbedCss() {
    const def = FONT_DEFS.find(f => f.key === currentKey);
    if (!def || def.key === DEFAULT_KEY) return null;
    let pending = embedCssCache.get(def.key);
    if (!pending) {
        pending = buildEmbedCss(def).catch(() => null);
        embedCssCache.set(def.key, pending);
    }
    const css = await pending;
    if (!css) embedCssCache.delete(def.key);   // offline/transient — retry next export
    return css;
}

// ───────────────────── Rendering ─────────────────────

function renderActive() {
    if (!listEl) return;
    listEl.querySelectorAll('.font-option').forEach(btn => {
        const active = btn.dataset.fontKey === currentKey;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

function buildOption(def) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'font-option';
    btn.dataset.fontKey = def.key;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Use ${def.label} font`);

    const name = document.createElement('span');
    name.className = 'font-option-name';
    name.textContent = def.label;
    name.style.fontFamily = def.stack;   // live preview in the font itself

    const category = document.createElement('span');
    category.className = 'font-option-category';
    category.textContent = def.key === DEFAULT_KEY ? `${def.category} · Default` : def.category;

    btn.append(name, category);
    btn.addEventListener('click', () => setFont(def.key));
    return btn;
}

// ───────────────────── Init ─────────────────────

export function initFontManager() {
    listEl = document.getElementById('font-list');
    if (!listEl) return;

    listEl.replaceChildren(...FONT_DEFS.map(buildOption));

    const def = FONT_DEFS.find(f => f.key === currentKey);
    if (def && def.key !== DEFAULT_KEY) applyFont(def);
    renderActive();
}
