const STORAGE_KEY = 'vinylUiThemeV1';
const systemDark = matchMedia('(prefers-color-scheme: dark)');

function loadPreference() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return ['system', 'dark', 'light'].includes(value) ? value : 'system';
    } catch {
        return 'system';
    }
}

function resolvedTheme(preference) {
    return preference === 'system' ? (systemDark.matches ? 'dark' : 'light') : preference;
}

function apply(preference) {
    document.documentElement.dataset.uiTheme = resolvedTheme(preference);
    document.querySelectorAll('button[data-ui-theme]').forEach((button) => {
        const active = button.dataset.uiTheme === preference;
        button.setAttribute('aria-checked', String(active));
        button.tabIndex = active ? 0 : -1;
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content', resolvedTheme(preference) === 'light' ? '#f6f6f8' : '#09090b'
    );
}

export function initUiTheme() {
    let preference = loadPreference();
    apply(preference);
    const buttons = [...document.querySelectorAll('button[data-ui-theme]')];
    const selectTheme = (button) => {
        preference = button.dataset.uiTheme;
        try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
        apply(preference);
    };
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
            selectTheme(button);
        });
        button.addEventListener('keydown', (event) => {
            const first = event.key === 'Home';
            const last = event.key === 'End';
            const move = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
                : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
            if (!first && !last && !move) return;
            event.preventDefault();
            const nextIndex = first ? 0 : last ? buttons.length - 1
                : (index + move + buttons.length) % buttons.length;
            const next = buttons[nextIndex];
            selectTheme(next);
            next.focus();
        });
    });
    systemDark.addEventListener('change', () => { if (preference === 'system') apply(preference); });
}
