const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

let container = null;

function ensureContainer() {
    if (!container) container = document.getElementById('toast-container');
    return container;
}

export function toast(message, { variant = 'info', duration = 3200 } = {}) {
    const root = ensureContainer();
    if (!root) return;

    const el = document.createElement('div');
    el.className = `toast toast-${variant}`;
    el.setAttribute('role', variant === 'error' ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = ICONS[variant] || ICONS.info;

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;

    el.append(icon, text);
    root.appendChild(el);

    const remove = () => {
        if (!el.isConnected) return;
        el.dataset.leaving = 'true';
        el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    setTimeout(remove, duration);
    el.addEventListener('click', remove);
}

export const toastSuccess = (msg, opts) => toast(msg, { ...opts, variant: 'success' });
export const toastError   = (msg, opts) => toast(msg, { ...opts, variant: 'error' });
export const toastInfo    = (msg, opts) => toast(msg, { ...opts, variant: 'info' });
