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
        button.setAttribute('aria-pressed', String(button.dataset.uiTheme === preference));
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content', resolvedTheme(preference) === 'light' ? '#f6f6f8' : '#09090b'
    );
}

export function initUiTheme() {
    let preference = loadPreference();
    apply(preference);
    document.querySelectorAll('button[data-ui-theme]').forEach((button) => {
        button.addEventListener('click', () => {
            preference = button.dataset.uiTheme;
            try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
            apply(preference);
        });
    });
    systemDark.addEventListener('change', () => { if (preference === 'system') apply(preference); });
}
