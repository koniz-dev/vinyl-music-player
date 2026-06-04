const drawer = document.getElementById('settings-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const openBtn = document.getElementById('open-settings-btn');
const closeBtn = document.getElementById('close-settings-btn');

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
