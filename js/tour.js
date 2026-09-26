import { revealSettingsSection } from './drawer.js';

/* Help should get a person to a useful first result, then be available as a
 * map of the rest of the product. It is intentionally on demand and uses the
 * settings column itself, so opening help never covers the live preview. */

export function initTour() {
    const modal = document.getElementById('guide-modal');
    const closeButton = document.getElementById('guide-close-btn');
    const openButtons = document.querySelectorAll('#tour-btn');
    const settingsForm = document.getElementById('musicForm');
    if (!modal || !closeButton || !settingsForm) return;

    let returnFocus;

    const open = (opener) => {
        returnFocus = opener || document.activeElement;
        settingsForm.hidden = true;
        modal.hidden = false;
        closeButton.focus({ preventScroll: true });
    };

    const close = ({ restoreFocus = true } = {}) => {
        modal.hidden = true;
        settingsForm.hidden = false;
        if (restoreFocus) returnFocus?.focus?.({ preventScroll: true });
    };

    openButtons.forEach(button => button.addEventListener('click', () => open(button)));
    closeButton.addEventListener('click', () => close());
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });

    document.addEventListener('keydown', (event) => {
        if (!modal.hidden && event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    });

    modal.querySelectorAll('[data-guide-target]').forEach((button) => {
        button.addEventListener('click', () => {
            const [section, selector] = button.dataset.guideTarget.split(':');
            const detailsSelector = button.dataset.guideDetails;
            // Opening a nested disclosure is an explicit request from the
            // guide, so the highlighted control is visible after navigation.
            if (detailsSelector) document.querySelector(detailsSelector)?.setAttribute('open', '');
            close({ restoreFocus: false });
            revealSettingsSection(section, selector);
        });
    });

}
