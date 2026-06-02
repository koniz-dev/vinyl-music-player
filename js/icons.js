/**
 * Curated subset of Lucide icons (v6 paths).
 * Source: https://lucide.dev — ISC license.
 *
 * Usage in DOM:
 *   element.innerHTML = icon('play', { size: 20 });
 *
 * Usage as data attribute (auto-hydrated by hydrateStaticIcons):
 *   <span data-icon="settings" data-icon-size="16"></span>
 */

const ATTR_OUTLINE = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const ATTR_FILLED  = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"';

const PATHS = {
    play:         '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause:        '<rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/>',
    volume:       '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    'volume-x':   '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
    repeat:       '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    settings:     '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    info:         '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    x:            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    copy:         '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check:        '<polyline points="20 6 9 17 4 12"/>',
    'check-circle':'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'alert-circle':'<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    plus:         '<path d="M5 12h14"/><path d="M12 5v14"/>',
    braces:       '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    music:        '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    image:        '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
};

const FILLED = new Set(['play', 'pause']);

export function icon(name, { size = 18, strokeWidth = 2, className = '' } = {}) {
    const path = PATHS[name];
    if (!path) return '';
    let attrs = FILLED.has(name) ? ATTR_FILLED : ATTR_OUTLINE;
    if (strokeWidth !== 2 && !FILLED.has(name)) {
        attrs = attrs.replace('stroke-width="2"', `stroke-width="${strokeWidth}"`);
    }
    const cls = className ? ` class="${className}"` : '';
    return `<svg width="${size}" height="${size}"${cls} ${attrs}>${path}</svg>`;
}

export function hydrateStaticIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.dataset.icon;
        const size = parseInt(el.dataset.iconSize, 10) || 18;
        const stroke = parseFloat(el.dataset.iconStroke) || 2;
        el.innerHTML = icon(name, { size, strokeWidth: stroke });
    });
}
