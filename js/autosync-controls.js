import { state } from './lib/state.js';
import { runAutoSync, cancelAutoSync, isAutoSyncRunning } from './autosync.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

export function initAutoSyncControls({
    button, label, status, pastedLyricsInput, modelInput, audioFileInput,
    songTitleInput, artistNameInput, getItems, replaceItems, appendItem,
    publishLyrics,
}) {
    let startedAt = 0;
    const setUi = running => {
        button.classList.toggle('running', running);
        label.textContent = running ? 'Cancel' : 'Auto-sync';
        status.hidden = !running;
        if (!running) status.textContent = '';
    };
    const showProgress = ({ stage, percent }) => {
        const messages = {
            decode: 'Decoding audio…',
            download: `Downloading AI model… ${percent || 0}% (first run only)`,
            init: 'Starting AI model…',
            transcribe: 'Transcribing… long songs can take a few minutes.',
            align: 'Aligning lyrics…',
        };
        status.textContent = messages[stage] || '';
    };
    button.addEventListener('click', async () => {
        if (isAutoSyncRunning()) {
            if (performance.now() - startedAt > 500) cancelAutoSync();
            return;
        }
        const audioFile = audioFileInput.files[0];
        if (!audioFile) return toastError('Upload an audio file first.');
        if (state.isExporting) return toastInfo('Wait for the export to finish — both need the CPU.');

        const pasted = pastedLyricsInput.value.split('\n').map(line => line.trim()).filter(Boolean);
        if (pasted.length) {
            replaceItems(pasted.map(text => ({ text })));
            pastedLyricsInput.value = '';
        }
        const items = getItems();
        const lineTexts = items.map(item => item.querySelector('.lyrics-text-input')?.value.trim() || '');
        startedAt = performance.now();
        setUi(true);
        try {
            const result = await runAutoSync({
                file: audioFile,
                lineTexts,
                hintText: `${songTitleInput.value} ${artistNameInput.value}`,
                model: modelInput.value,
                onProgress: showProgress,
            });
            if (result.mode === 'align') {
                let synced = 0;
                result.lines.forEach((time, index) => {
                    const item = items[index];
                    if (!time || !item?.isConnected) return;
                    const times = item.querySelectorAll('.time-input');
                    if (times[0]) times[0].value = time.start;
                    if (times[1]) times[1].value = time.end;
                    if (Array.isArray(time.words) && time.words.length) item.dataset.words = JSON.stringify(time.words);
                    synced++;
                });
                publishLyrics();
                synced
                    ? toastSuccess(`Synced ${synced} line${synced === 1 ? '' : 's'} — fine-tune any times that feel off.`)
                    : toastInfo("Couldn't match the lyrics to the audio — check the text matches what's sung.");
            } else {
                result.lines.forEach(appendItem);
                publishLyrics();
                result.lines.length
                    ? toastSuccess(`Transcribed ${result.lines.length} lines — fix any words the AI misheard.`)
                    : toastInfo('No vocals detected — add lines manually instead.');
            }
        } catch (error) {
            error?.name === 'AbortError'
                ? toastInfo('Auto-sync cancelled.')
                : toastError(`Auto-sync failed: ${error?.message || error}`);
        } finally {
            if (!isAutoSyncRunning()) setUi(false);
        }
    });
}
