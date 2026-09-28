import { timeToSeconds } from './lib/format.js';
import { parseLrc, serializeLrc } from './lrc.js';
import { findSyncedLyrics } from './lrclib.js';
import { confirmDialog, selectDialog } from './dialog.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

const TIME_PATTERN = /^[0-9]{1,2}:[0-9]{2}$/;

function validateRows(rows) {
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects');
    rows.forEach((row, index) => {
        if (!row || typeof row !== 'object') throw new Error(`Item at index ${index} must be an object`);
        if (![row.start, row.end, row.text].every(value => typeof value === 'string')) {
            throw new Error(`Item ${index}: needs 'start', 'end', 'text' strings`);
        }
        if (!TIME_PATTERN.test(row.start) || !TIME_PATTERN.test(row.end)) throw new Error(`Item ${index}: invalid time format (use mm:ss)`);
        if (timeToSeconds(row.start) >= timeToSeconds(row.end)) throw new Error(`Item ${index}: end must be after start`);
    });
}

export function initLyricsImportControls({
    openButton, exportButton, findButton, modal, closeButton, cancelButton, importButton,
    sourceInput, replaceButton, appendButton, overwriteWarning, overwriteCount,
    songTitleInput, artistNameInput, getLyrics, getItemCount, replaceRows, appendRows,
    publishLyrics, totalTime,
}) {
    let mode = 'replace';
    const updateMode = value => {
        mode = value;
        replaceButton.classList.toggle('active', mode === 'replace');
        replaceButton.setAttribute('aria-pressed', mode === 'replace');
        appendButton.classList.toggle('active', mode === 'append');
        appendButton.setAttribute('aria-pressed', mode === 'append');
        const count = getItemCount();
        overwriteCount.textContent = String(count);
        overwriteWarning.hidden = mode !== 'replace' || count === 0;
    };
    const close = () => { modal.hidden = true; sourceInput.value = ''; };
    openButton.addEventListener('click', () => { updateMode('replace'); modal.hidden = false; sourceInput.focus(); });
    closeButton.addEventListener('click', close);
    cancelButton.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });
    replaceButton.addEventListener('click', () => updateMode('replace'));
    appendButton.addEventListener('click', () => updateMode('append'));
    importButton.addEventListener('click', () => {
        const raw = sourceInput.value.trim();
        if (!raw) return toastInfo('Nothing to import — paste JSON or hit Cancel.');
        try {
            const rows = raw.startsWith('[') && raw.includes('{') ? JSON.parse(raw) : parseLrc(raw, totalTime());
            validateRows(rows);
            if (mode === 'replace') replaceRows(rows); else appendRows(rows);
            publishLyrics(); close();
            toastSuccess(`${mode === 'append' ? 'Appended' : 'Imported'} ${rows.length} lyric lines.`);
        } catch (error) { toastError(error.message); }
    });
    exportButton.addEventListener('click', () => {
        const lyrics = getLyrics();
        if (!lyrics.length) return toastInfo('Add lyrics before exporting LRC.');
        const url = URL.createObjectURL(new Blob([serializeLrc(lyrics)], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = `${songTitleInput.value.trim() || 'lyrics'}.lrc`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    });
    findButton.addEventListener('click', async () => {
        const title = songTitleInput.value.trim(), artist = artistNameInput.value.trim();
        if (!title && !artist) return toastInfo('Add a song title or artist first.');
        if (!await confirmDialog({ dialogTitle: 'Find synced lyrics?', dialogMessage: 'This sends the song title, artist, and duration to LRCLIB. Your audio stays on this device.' })) return;
        findButton.disabled = true;
        try {
            const results = await findSyncedLyrics({ title, artist, duration: totalTime() });
            if (!results.length) return toastInfo('No synced lyrics found. Try Auto-sync instead.');
            let selected = results[0];
            if (results.length > 1) {
                const candidates = results.slice(0, 10);
                const choice = await selectDialog({ dialogTitle: 'Choose synced lyrics', dialogMessage: 'Select the version that best matches this track.', confirmLabel: 'Use lyrics', options: candidates.map(result => `${result.trackName} — ${result.artistName}`) });
                if (choice === null) return;
                selected = choice;
            }
            const rows = parseLrc(selected.syncedLyrics, totalTime());
            if (!rows.length) return toastInfo('That result did not contain usable timed lyrics.');
            if (getItemCount() && !await confirmDialog({ dialogTitle: 'Replace current lyrics?', dialogMessage: 'Your current lyric lines will be replaced by the selected synced lyrics.', confirmLabel: 'Replace lyrics', dangerous: true })) return;
            replaceRows(rows); publishLyrics(); toastSuccess('Imported synced lyrics.');
        } catch (error) { toastError(`Could not find lyrics: ${error.message || error}`); }
        finally { findButton.disabled = false; }
    });
}
