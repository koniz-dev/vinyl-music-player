const drawer = document.getElementById('settings-drawer');
const backdrop = document.getElementById('drawer-backdrop');
const openBtn = document.getElementById('open-settings-btn');
const closeBtn = document.getElementById('close-settings-btn');

function open() {
    drawer.dataset.open = 'true';
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.dataset.open = 'true'; });
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

function close() {
    drawer.dataset.open = 'false';
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.dataset.open = 'false';
    setTimeout(() => { backdrop.hidden = true; }, 240);
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

export function initDrawer() {
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.dataset.open === 'true') close();
    });
}
