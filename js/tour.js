import { revealSettingsSection } from './drawer.js';

/* Help should get a person to a useful first result, then be available as a
 * map of the rest of the product. This is intentionally not an auto-playing
 * carousel: the visible Start here card handles first-run orientation, while
 * this dialog is opened on demand and routes each question to its real UI. */

export function initTour() {
    const modal = document.getElementById('guide-modal');
    const closeButton = document.getElementById('guide-close-btn');
    const openButtons = document.querySelectorAll('[data-guide-open], #tour-btn');
    const startCard = document.getElementById('getting-started');
    const audioZone = document.getElementById('audio-upload-area');
    if (!modal || !closeButton) return;

    let returnFocus;

    const open = (opener) => {
        returnFocus = opener || document.activeElement;
        modal.hidden = false;
        closeButton.focus({ preventScroll: true });
    };

    const close = ({ restoreFocus = true } = {}) => {
        modal.hidden = true;
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

    // The first-run card is an empty state, not a permanent extra setting.
    // Observe the existing source of truth so it also returns after removing
    // an audio file.
    if (startCard && audioZone) {
        const updateStartCard = () => { startCard.hidden = audioZone.dataset.loaded === 'true'; };
        updateStartCard();
        new MutationObserver(updateStartCard).observe(audioZone, {
            attributes: true,
            attributeFilter: ['data-loaded'],
        });
    }
}
