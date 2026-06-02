import { icon } from './icons.js';

const ICONS = {
    success: icon('check-circle', { size: 18, strokeWidth: 2.5 }),
    error:   icon('alert-circle', { size: 18, strokeWidth: 2.5 }),
    info:    icon('info',         { size: 18, strokeWidth: 2.5 }),
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

    const iconWrap = document.createElement('span');
    iconWrap.className = 'toast-icon';
    iconWrap.innerHTML = ICONS[variant] || ICONS.info;

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;

    el.append(iconWrap, text);
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
