import { on, Events } from './lib/events.js';
import { state } from './lib/state.js';

const drawer = document.getElementById('settings-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const openBtn = document.getElementById('open-settings-btn');
const closeBtn = document.getElementById('close-settings-btn');

/* Collapsible sections — the workflow is linear (song → lyrics → style →
   export), so only the first step starts open; the rest is one click away.
   Open/closed state persists so returning users keep their layout. */
const SECTIONS_KEY = 'settingsSections';
const SECTION_DEFAULTS = { song: true, lyrics: false, appearance: false, export: false };

function loadSectionState() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SECTIONS_KEY));
        if (!parsed || typeof parsed !== 'object') return { ...SECTION_DEFAULTS };
        return { ...SECTION_DEFAULTS, ...parsed };
    } catch {
        return { ...SECTION_DEFAULTS };
    }
}

/* One-line status shown on a COLLAPSED section header, so the whole
   configuration stays glanceable without opening anything. Each reads the
   live DOM/state at refresh time — no extra bookkeeping to drift. */
const SUMMARIZERS = {
    song() {
        const zone = document.getElementById('audio-upload-area');
        if (!zone || zone.dataset.loaded !== 'true') return '';
        return zone.querySelector('.dz-title')?.textContent.trim() || '';
    },
    lyrics() {
        const n = document.querySelectorAll('#lyrics-container .lyrics-item').length;
        return n ? `${n} ${n === 1 ? 'line' : 'lines'}` : '';
    },
    appearance() {
        const palette = document.querySelector('.palette-chip.active .palette-chip-name')?.textContent.trim();
        const customized = !!document.querySelector('.color-row[data-overridden="true"]');
        const font = document.querySelector('.font-option.active .font-option-name')?.textContent.trim();
        const parts = [];
        if (palette && palette !== 'Default') parts.push(palette);
        else if (customized) parts.push('Custom');
        if (font && font !== 'Inter') parts.push(font);
        return parts.join(' · ');   // all-default → empty, header stays clean
    },
    export() {
        return `${state.aspectRatio} · ${String(state.videoFormat || '').toUpperCase()}`;
    },
};

function refreshSummaries() {
    drawer.querySelectorAll('.settings-section[data-section-key]').forEach((section) => {
        const el = section.querySelector('.section-summary');
        const summarize = SUMMARIZERS[section.dataset.sectionKey];
        if (el && summarize) el.textContent = summarize();
    });
}

function initSectionToggles() {
    const openState = loadSectionState();
    drawer.querySelectorAll('.settings-section[data-section-key]').forEach((section) => {
        const key = section.dataset.sectionKey;
        const toggle = section.querySelector('.section-toggle');
        const body = section.querySelector('.settings-section-body');
        if (!toggle || !body) return;

        const apply = (open) => {
            section.dataset.collapsed = String(!open);
            toggle.setAttribute('aria-expanded', String(open));
            body.hidden = !open;
        };

        apply(openState[key] === true);
        toggle.addEventListener('click', () => {
            openState[key] = section.dataset.collapsed === 'true';
            try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(openState)); } catch {}
            apply(openState[key]);
            refreshSummaries();
        });
    });
    refreshSummaries();

    // Async paths that change content while its section may be collapsed
    // (AI auto-sync finishing, JSON import) — rAF lets the producing module
    // finish its own DOM updates first.
    on(Events.UPDATE_LYRICS, () => requestAnimationFrame(refreshSummaries));
    on(Events.PLAY_FILE, () => requestAnimationFrame(refreshSummaries));
}

const desktopQuery = matchMedia('(min-width: 880px)');
const isDesktop = () => desktopQuery.matches;

function setOpen(open) {
    if (isDesktop()) {
        // Desktop split: drawer is permanent + interactive — no inert/backdrop/lock
        drawer.inert = false;
        drawer.dataset.open = 'true';
        backdrop.hidden = true;
        document.body.style.overflow = '';
        openBtn.setAttribute('aria-expanded', 'true');
        return;
    }

    if (open) {
        drawer.inert = false;
        drawer.dataset.open = 'true';
        backdrop.hidden = false;
        requestAnimationFrame(() => { backdrop.dataset.open = 'true'; });
        openBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        return;
    }

    // Closing — move focus OUT before marking inert (avoids a11y warning)
    if (drawer.contains(document.activeElement)) {
        document.activeElement.blur();
        openBtn.focus({ preventScroll: true });
    }
    drawer.inert = true;
    drawer.dataset.open = 'false';
    backdrop.dataset.open = 'false';
    setTimeout(() => { backdrop.hidden = true; }, 240);
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

function syncToViewport() {
    setOpen(isDesktop());
}

export function initDrawer() {
    initSectionToggles();

    openBtn.addEventListener('click', () => setOpen(true));
    closeBtn.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));

    // The "Open Settings to upload audio" hint in the preview is a button —
    // tapping it opens the drawer (it's hidden on desktop, where the panel is
    // always visible).
    const stageHint = document.getElementById('stage-hint');
    if (stageHint) stageHint.addEventListener('click', () => setOpen(true));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !isDesktop() && drawer.dataset.open === 'true') {
            setOpen(false);
        }
    });

    desktopQuery.addEventListener('change', syncToViewport);
    syncToViewport();
}
