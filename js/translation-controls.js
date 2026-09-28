import { confirmDialog } from './dialog.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import {
    translateLyrics,
    getTranslationStorageEstimate,
    removeTranslationModel,
    TRANSLATION_MODEL_MIN_FREE_BYTES,
} from './translate.js';

export function initTranslationControls({ translateButton, directionInput, removeModelButton, getItems, publishLyrics }) {
    translateButton.addEventListener('click', async () => {
        const items = getItems();
        const lines = items.map(item => item.querySelector('.lyrics-text-input')?.value.trim() || '').filter(Boolean);
        if (!lines.length) return toastInfo('Add lyrics before translating.');

        const direction = directionInput.value;
        const estimate = await getTranslationStorageEstimate();
        const requiredGb = (TRANSLATION_MODEL_MIN_FREE_BYTES / 1e9).toFixed(1);
        if (estimate && estimate.available < TRANSLATION_MODEL_MIN_FREE_BYTES) {
            return toastError(`Not enough browser storage. Free at least about ${requiredGb} GB, then try again.`);
        }
        const space = estimate
            ? ` Browser storage reports about ${(estimate.available / 1e9).toFixed(1)} GB available.`
            : ' Your browser could not report available storage.';
        if (!await confirmDialog({
            dialogTitle: 'Download translation model?',
            dialogMessage: `This downloads the on-device NLLB ${direction.replace('-', ' → ')} translation model (over 1 GB on first use). It uses disk space and may take time; lyrics and audio stay in your browser.${space}`,
            confirmLabel: 'Download model',
        })) return;

        translateButton.disabled = true;
        const label = translateButton.textContent;
        try {
            const translations = await translateLyrics(lines, direction, stage => {
                translateButton.textContent = stage === 'download' ? 'Downloading model…' : 'Translating…';
            });
            let index = 0;
            items.forEach(item => {
                const text = item.querySelector('.lyrics-text-input')?.value.trim();
                if (text) item.dataset.translation = translations[index++] || '';
            });
            publishLyrics();
            toastSuccess(`Translated ${lines.length} lyric line${lines.length === 1 ? '' : 's'} locally.`);
        } catch (error) {
            toastError(`Translation failed: ${error.message || error}`);
        } finally {
            translateButton.disabled = false;
            translateButton.textContent = label;
        }
    });

    removeModelButton.addEventListener('click', async () => {
        if (!await confirmDialog({
            dialogTitle: 'Remove translation model?',
            dialogMessage: 'This does not remove your music, lyrics, or app settings. Translating again will download the model again.',
            confirmLabel: 'Remove model',
            dangerous: true,
        })) return;

        removeModelButton.disabled = true;
        const label = removeModelButton.textContent;
        try {
            const removed = await removeTranslationModel(stage => {
                if (stage === 'removing') removeModelButton.textContent = 'Removing model…';
            });
            toastSuccess(removed ? 'Removed the downloaded translation model.' : 'No downloaded translation model was found.');
        } catch (error) {
            toastError(`Could not remove model: ${error.message || error}`);
        } finally {
            removeModelButton.disabled = false;
            removeModelButton.textContent = label;
        }
    });
}
