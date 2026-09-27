import { emit, on, Events } from './lib/events.js';
import { timeToSeconds, formatTime } from './lib/format.js';
import { initColorManager, applyPaletteByKey } from './color-manager.js';
import { initFontManager, setPlayerFont } from './font-manager.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { confirmDialog, selectDialog } from './dialog.js';
import { icon } from './icons.js';
import { state, RATIOS, DEFAULT_ASPECT_RATIO, FORMATS, DEFAULT_VIDEO_FORMAT } from './lib/state.js';
import { runAutoSync, cancelAutoSync, isAutoSyncRunning } from './autosync.js';
import { readId3Metadata } from './id3.js';
import { parseLrc, serializeLrc } from './lrc.js';
import { findSyncedLyrics } from './lrclib.js';
import { translateLyrics, getTranslationStorageEstimate, removeTranslationModel, TRANSLATION_MODEL_MIN_FREE_BYTES } from './translate.js';

const TIME_PATTERN = /^[0-9]{1,2}:[0-9]{2}$/;

let lyricsCount = 0;
let lastAudioObjectUrl = null;
let lastAlbumArtObjectUrl = null;

const lyricsContainer = document.getElementById('lyrics-container');
const lyricsEmpty = document.getElementById('lyrics-empty');
const addLyricsBtn = document.getElementById('add-lyrics-btn');
const clearLyricsBtn = document.getElementById('clear-lyrics-btn');
const autoSyncBtn = document.getElementById('auto-sync-btn');
const autoSyncLabel = document.getElementById('auto-sync-label');
const autoSyncStatus = document.getElementById('autosync-status');
const autoSyncInput = document.getElementById('autosync-lyrics-input');
const whisperModelInput = document.getElementById('whisper-model');
const importOverwriteWarning = document.getElementById('import-overwrite-warning');
const importOverwriteCount = document.getElementById('import-overwrite-count');
const importModeReplaceBtn = document.getElementById('import-mode-replace');
const importModeAppendBtn = document.getElementById('import-mode-append');

let importMode = 'replace';
const devLyricsBtn = document.getElementById('dev-lyrics-btn');
const devLyricsModal = document.getElementById('dev-lyrics-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalImportBtn = document.getElementById('modal-import-btn');
const jsonLyricsInput = document.getElementById('json-lyrics-input');
const uploadArea = document.getElementById('upload-area');
const albumArtInput = document.getElementById('album-art');
const audioUploadArea = document.getElementById('audio-upload-area');
const audioFileInput = document.getElementById('audio-file');
const songTitleInput = document.getElementById('song-title');
const artistNameInput = document.getElementById('artist-name');
const audioClearBtn = document.getElementById('audio-clear-btn');
const albumArtClearBtn = document.getElementById('album-art-clear-btn');
const aiArtPrompt = document.getElementById('ai-art-prompt');
const aiArtBtn = document.getElementById('ai-art-btn');
const aiArtPanel = aiArtBtn.closest('.cover-generator-panel');
const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportBtnFill = document.getElementById('export-btn-fill');
const exportBtnLabel = document.getElementById('export-btn-label');
const visualizerEnabledInput = document.getElementById('visualizer-enabled');
const suggestThemeBtn = document.getElementById('suggest-theme-btn');
const exportLrcBtn = document.getElementById('export-lrc-btn');
const findLyricsBtn = document.getElementById('find-lyrics-btn');
const translateLyricsBtn = document.getElementById('translate-lyrics-btn');
const translationDirectionInput = document.getElementById('translation-direction');
const removeTranslationModelBtn = document.getElementById('remove-translation-model-btn');
const exportStartInput = document.getElementById('export-start');
const exportEndInput = document.getElementById('export-end');

// ---------- Lyrics editor ----------

function buildLyricsItem({ start = '', end = '', text = '', words = [], translation = '' } = {}) {
    lyricsCount++;

    const item = document.createElement('div');
    item.className = 'lyrics-item';
    if (Array.isArray(words) && words.length) item.dataset.words = JSON.stringify(words);
    if (translation) item.dataset.translation = translation;

    const header = document.createElement('div');
    header.className = 'lyrics-item-header';

    const grip = document.createElement('span');
    grip.className = 'lyrics-grip';
    grip.setAttribute('aria-label', 'Drag to reorder');
    grip.setAttribute('title', 'Drag to reorder');
    grip.draggable = true;
    grip.innerHTML = icon('grip-vertical', { size: 14 });
    wireGripDragHandlers(grip, item);

    const title = document.createElement('span');
    title.className = 'lyrics-item-title';
    title.textContent = `Line ${lyricsCount}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-lyrics-btn';
    removeBtn.setAttribute('aria-label', 'Remove this line');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        item.remove();
        publishLyrics();
        refreshLyricsEmptyState();
    });

    header.append(grip, title, removeBtn);

    const inputs = document.createElement('div');
    inputs.className = 'lyrics-inputs';

    const startInput = createInput({
        className: 'time-input',
        placeholder: '00:00',
        value: start,
        pattern: '[0-9]{1,2}:[0-9]{2}',
        ariaLabel: 'Start time',
    });
    const endInput = createInput({
        className: 'time-input',
        placeholder: '00:05',
        value: end,
        pattern: '[0-9]{1,2}:[0-9]{2}',
        ariaLabel: 'End time',
    });
    const textWrap = document.createElement('div');
    textWrap.className = 'lyrics-text-wrap';
    const textInput = createInput({
        className: 'lyrics-text-input',
        placeholder: 'Lyric line…',
        value: text,
        ariaLabel: 'Lyric text',
    });
    textWrap.appendChild(textInput);

    // A textual edit invalidates word-level ASR alignment. Keep line timing,
    // but never highlight a stale word map against newly edited lyrics.
    textInput.addEventListener('input', () => { delete item.dataset.words; delete item.dataset.translation; }, true);

    inputs.append(startInput, endInput, textWrap);
    item.append(header, inputs);
    return item;
}

function createInput({ className, placeholder, value, pattern, ariaLabel }) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.placeholder = placeholder;
    input.value = value;
    if (pattern) input.pattern = pattern;
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    input.addEventListener('input', publishLyrics);
    if (className === 'time-input') {
        input.addEventListener('blur', () => {
            const normalized = normalizeTimeString(input.value);
            if (normalized !== null && normalized !== input.value) {
                input.value = normalized;
                publishLyrics();
            }
        });
    }
    return input;
}

/**
 * Lenient mm:ss normalizer.
 *   "1:5"  → "01:05"
 *   ":30"  → "00:30"
 *   "1:30" → "01:30"
 *   ""     → ""           (kept empty for "default end = start+5")
 *   "abc"  → null         (let invalid-CSS feedback show the error)
 */
function normalizeTimeString(raw) {
    const trimmed = String(raw).trim();
    if (trimmed === '') return '';
    const match = trimmed.match(/^([0-9]{0,2}):([0-9]{1,2})$/);
    if (!match) return null;
    const m = (match[1] || '0').padStart(2, '0');
    const s = match[2].padStart(2, '0');
    if (parseInt(s, 10) > 59) return null;
    return `${m}:${s}`;
}

// ---------- Drag-to-reorder ----------

let draggedItem = null;

function wireGripDragHandlers(grip, item) {
    grip.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.dataset.dragging = 'true';
        // Firefox needs setData to start a drag
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    });
    grip.addEventListener('dragend', () => {
        if (draggedItem) delete draggedItem.dataset.dragging;
        draggedItem = null;
        lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => {
            delete el.dataset.dropTarget;
        });
    });
}

function findClosestItem(y) {
    const items = [...lyricsContainer.querySelectorAll('.lyrics-item:not([data-dragging="true"])')];
    let closest = null;
    let closestDist = Number.POSITIVE_INFINITY;
    let insertBefore = false;
    for (const el of items) {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(y - mid);
        if (dist < closestDist) {
            closestDist = dist;
            closest = el;
            insertBefore = y < mid;
        }
    }
    return { closest, insertBefore };
}

function bindReorderContainer() {
    lyricsContainer.addEventListener('dragover', (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const { closest } = findClosestItem(e.clientY);
        lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => {
            el.dataset.dropTarget = el === closest && el !== draggedItem ? 'true' : 'false';
        });
    });

    lyricsContainer.addEventListener('drop', (e) => {
        if (!draggedItem) return;
        e.preventDefault();
        const { closest, insertBefore } = findClosestItem(e.clientY);
        if (closest && closest !== draggedItem) {
            if (insertBefore) {
                lyricsContainer.insertBefore(draggedItem, closest);
            } else {
                lyricsContainer.insertBefore(draggedItem, closest.nextSibling);
            }
            renumberLyricsTitles();
            publishLyrics();
        }
    });
}

function renumberLyricsTitles() {
    const items = lyricsContainer.querySelectorAll('.lyrics-item');
    items.forEach((el, i) => {
        const title = el.querySelector('.lyrics-item-title');
        if (title) title.textContent = `Line ${i + 1}`;
    });
    lyricsCount = items.length;
}

function refreshLyricsEmptyState() {
    const count = lyricsContainer.querySelectorAll('.lyrics-item').length;
    const hasItems = count > 0;
    if (lyricsEmpty) lyricsEmpty.hidden = hasItems;
    if (clearLyricsBtn) clearLyricsBtn.hidden = !hasItems;
}

function clearAllLyrics() {
    lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => el.remove());
    lyricsCount = 0;
    refreshLyricsEmptyState();
    publishLyrics();
}

// Pre-fill times for a manually added line so the user only tweaks them:
// first line starts at 00:00; every next line starts 1s after the previous
// line's end (or its start+5s when the end was left blank — matches the
// publishLyrics default). End is always seeded to start+5s.
function nextLineSeed() {
    const items = lyricsContainer.querySelectorAll('.lyrics-item');
    if (items.length === 0) return { start: '00:00', end: '00:05' };

    const timeInputs = items[items.length - 1].querySelectorAll('.time-input');
    const lastStart = timeToSeconds(timeInputs[0]?.value || '');
    const lastEndRaw = timeInputs[1]?.value || '';
    const lastEnd = lastEndRaw === '' ? lastStart + 5 : timeToSeconds(lastEndRaw);

    const start = lastEnd + 1;
    return { start: formatTime(start), end: formatTime(start + 5) };
}

function addLyricsLine(seed) {
    const item = buildLyricsItem(seed);
    lyricsContainer.appendChild(item);
    refreshLyricsEmptyState();
    return item;
}

function publishLyrics() {
    const data = [];
    lyricsContainer.querySelectorAll('.lyrics-item').forEach(item => {
        const timeInputs = item.querySelectorAll('.time-input');
        const startStr = timeInputs[0]?.value || '00:00';
        const endStr = timeInputs[1]?.value || '';
        const text = item.querySelector('.lyrics-text-input')?.value.trim() || '';

        if (!text) return;
        const start = timeToSeconds(startStr);
        const end = endStr === '' ? start + 5 : timeToSeconds(endStr);
        let words;
        try {
            const parsed = JSON.parse(item.dataset.words || '[]');
            if (Array.isArray(parsed)) words = parsed;
        } catch {}
        const translation = item.dataset.translation || '';
        data.push({ start, end, text, ...(words?.length ? { words } : {}), ...(translation ? { translation } : {}) });
    });
    emit(Events.UPDATE_LYRICS, data);
}

// ---------- Auto-sync (Whisper) ----------

let autoSyncStartedAt = 0;

function setAutoSyncUI(running) {
    autoSyncBtn.classList.toggle('running', running);
    autoSyncLabel.textContent = running ? 'Cancel' : 'Auto-sync';
    autoSyncStatus.hidden = !running;
    if (!running) autoSyncStatus.textContent = '';
}

function showAutoSyncProgress({ stage, percent }) {
    const messages = {
        decode: 'Decoding audio…',
        download: `Downloading AI model… ${percent || 0}% (first run only)`,
        init: 'Starting AI model…',
        transcribe: 'Transcribing… long songs can take a few minutes.',
        align: 'Aligning lyrics…',
    };
    autoSyncStatus.textContent = messages[stage] || '';
}

async function handleAutoSync() {
    // Mid-run the button is the cancel control. Same grace period as the
    // export button — an accidental double-click must not cancel the run
    // it just started.
    if (isAutoSyncRunning()) {
        if (performance.now() - autoSyncStartedAt > 500) cancelAutoSync();
        return;
    }
    const audioFile = audioFileInput.files[0];
    if (!audioFile) {
        toastError('Upload an audio file first.');
        return;
    }
    if (state.isExporting) {
        toastInfo('Wait for the export to finish — both need the CPU.');
        return;
    }

    // Pasted lyrics take over: one item per pasted row, times left blank
    // for the alignment to fill. Otherwise sync the lines already in the
    // editor. Snapshot the items either way so edits made while Whisper
    // runs can't shift which line each result lands on; isConnected guards
    // removed lines.
    const pasted = autoSyncInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    if (pasted.length > 0) {
        lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => el.remove());
        lyricsCount = 0;
        pasted.forEach(text => lyricsContainer.appendChild(buildLyricsItem({ text })));
        refreshLyricsEmptyState();
        // The text now lives in the line items — a retry after an error
        // goes through the "sync existing lines" path.
        autoSyncInput.value = '';
    }
    const items = [...lyricsContainer.querySelectorAll('.lyrics-item')];
    const lineTexts = items.map(item =>
        item.querySelector('.lyrics-text-input')?.value.trim() || ''
    );

    autoSyncStartedAt = performance.now();
    setAutoSyncUI(true);
    try {
        const result = await runAutoSync({
            file: audioFile,
            lineTexts,
            // Title/artist help guess the song's language when no lyrics exist.
            hintText: `${songTitleInput.value} ${artistNameInput.value}`,
            model: whisperModelInput.value,
            onProgress: showAutoSyncProgress,
        });

        if (result.mode === 'align') {
            let synced = 0;
            result.lines.forEach((time, i) => {
                const item = items[i];
                if (!time || !item || !item.isConnected) return;
                const timeInputs = item.querySelectorAll('.time-input');
                if (timeInputs[0]) timeInputs[0].value = time.start;
                if (timeInputs[1]) timeInputs[1].value = time.end;
                if (Array.isArray(time.words) && time.words.length) {
                    item.dataset.words = JSON.stringify(time.words);
                }
                synced++;
            });
            publishLyrics();
            if (synced > 0) {
                toastSuccess(`Synced ${synced} line${synced === 1 ? '' : 's'} — fine-tune any times that feel off.`);
            } else {
                toastInfo("Couldn't match the lyrics to the audio — check the text matches what's sung.");
            }
        } else {
            result.lines.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
            refreshLyricsEmptyState();
            publishLyrics();
            if (result.lines.length > 0) {
                toastSuccess(`Transcribed ${result.lines.length} lines — fix any words the AI misheard.`);
            } else {
                toastInfo('No vocals detected — add lines manually instead.');
            }
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            toastInfo('Auto-sync cancelled.');
        } else {
            toastError(`Auto-sync failed: ${error?.message || error}`);
        }
    } finally {
        // A cancelled run's cleanup must not clobber the UI of a newer run
        // started after the cancel.
        if (!isAutoSyncRunning()) setAutoSyncUI(false);
    }
}

// ---------- JSON import ----------

function validateImportedLyrics(rows) {
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects');

    rows.forEach((row, i) => {
        if (typeof row !== 'object' || row === null) {
            throw new Error(`Item at index ${i} must be an object`);
        }
        if (typeof row.start !== 'string' || typeof row.end !== 'string' || typeof row.text !== 'string') {
            throw new Error(`Item ${i}: needs 'start', 'end', 'text' strings`);
        }
        if (!TIME_PATTERN.test(row.start) || !TIME_PATTERN.test(row.end)) {
            throw new Error(`Item ${i}: invalid time format (use mm:ss)`);
        }
        if (timeToSeconds(row.start) >= timeToSeconds(row.end)) {
            throw new Error(`Item ${i}: end must be after start`);
        }
    });
}

function setImportMode(mode) {
    importMode = mode;
    importModeReplaceBtn.classList.toggle('active', mode === 'replace');
    importModeReplaceBtn.setAttribute('aria-pressed', mode === 'replace');
    importModeAppendBtn.classList.toggle('active', mode === 'append');
    importModeAppendBtn.setAttribute('aria-pressed', mode === 'append');
    refreshImportWarning();
}

function refreshImportWarning() {
    const existing = lyricsContainer.querySelectorAll('.lyrics-item').length;
    if (importMode === 'replace' && existing > 0) {
        importOverwriteCount.textContent = String(existing);
        importOverwriteWarning.hidden = false;
    } else {
        importOverwriteWarning.hidden = true;
    }
}

function openImportModal() {
    setImportMode('replace');
    devLyricsModal.hidden = false;
    jsonLyricsInput.focus();
}

function closeImportModal() {
    devLyricsModal.hidden = true;
    jsonLyricsInput.value = '';
}

function importLyricsFromJson() {
    const raw = jsonLyricsInput.value.trim();
    if (!raw) {
        toastInfo('Nothing to import — paste JSON or hit Cancel.');
        return;
    }
    try {
        const rows = raw.startsWith('[') && raw.includes('{') ? JSON.parse(raw) : parseLrc(raw, state.totalTime);
        validateImportedLyrics(rows);

        if (importMode === 'replace') {
            lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => el.remove());
            lyricsCount = 0;
        }
        rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
        refreshLyricsEmptyState();

        publishLyrics();
        closeImportModal();
        const verb = importMode === 'append' ? 'Appended' : 'Imported';
        toastSuccess(`${verb} ${rows.length} lyric lines.`);
    } catch (error) {
        toastError(error.message);
    }
}

function exportLrc() {
    if (!state.lyrics.length) return toastInfo('Add lyrics before exporting LRC.');
    const blob = new Blob([serializeLrc(state.lyrics)], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${songTitleInput.value.trim() || 'lyrics'}.lrc`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function handleFindLyrics() {
    const title = songTitleInput.value.trim();
    const artist = artistNameInput.value.trim();
    if (!title && !artist) return toastInfo('Add a song title or artist first.');
    if (!await confirmDialog({
        dialogTitle: 'Find synced lyrics?',
        dialogMessage: 'This sends the song title, artist, and duration to LRCLIB. Your audio stays on this device.',
    })) return;
    findLyricsBtn.disabled = true;
    try {
        const results = await findSyncedLyrics({ title, artist, duration: state.totalTime });
        if (!results.length) return toastInfo('No synced lyrics found. Try Auto-sync instead.');
        let selected = results[0];
        if (results.length > 1) {
            const candidates = results.slice(0, 10);
            const selectedCandidate = await selectDialog({
                dialogTitle: 'Choose synced lyrics',
                dialogMessage: 'Select the version that best matches this track.',
                confirmLabel: 'Use lyrics',
                options: candidates.map(result => `${result.trackName} — ${result.artistName}`),
            });
            if (selectedCandidate === null) return;
            selected = selectedCandidate;
        }
        const rows = parseLrc(selected.syncedLyrics, state.totalTime);
        if (!rows.length) return toastInfo('That result did not contain usable timed lyrics.');
        if (lyricsContainer.children.length && !await confirmDialog({
            dialogTitle: 'Replace current lyrics?',
            dialogMessage: 'Your current lyric lines will be replaced by the selected synced lyrics.',
            confirmLabel: 'Replace lyrics',
            dangerous: true,
        })) return;
        lyricsContainer.querySelectorAll('.lyrics-item').forEach(el => el.remove());
        lyricsCount = 0;
        rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
        refreshLyricsEmptyState(); publishLyrics();
        toastSuccess('Imported synced lyrics.');
    } catch (error) { toastError(`Could not find lyrics: ${error.message || error}`); }
    finally { findLyricsBtn.disabled = false; }
}

async function handleTranslateLyrics() {
    const items = [...lyricsContainer.querySelectorAll('.lyrics-item')];
    const lines = items.map(item => item.querySelector('.lyrics-text-input')?.value.trim() || '').filter(Boolean);
    if (!lines.length) return toastInfo('Add lyrics before translating.');
    const direction = translationDirectionInput.value;
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
    translateLyricsBtn.disabled = true;
    const label = translateLyricsBtn.textContent;
    try {
        const translations = await translateLyrics(lines, direction, (stage) => {
            translateLyricsBtn.textContent = stage === 'download' ? 'Downloading model…' : 'Translating…';
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
        translateLyricsBtn.disabled = false;
        translateLyricsBtn.textContent = label;
    }
}

async function handleRemoveTranslationModel() {
    if (!await confirmDialog({
        dialogTitle: 'Remove translation model?',
        dialogMessage: 'This does not remove your music, lyrics, or app settings. Translating again will download the model again.',
        confirmLabel: 'Remove model',
        dangerous: true,
    })) return;
    removeTranslationModelBtn.disabled = true;
    const label = removeTranslationModelBtn.textContent;
    try {
        const removed = await removeTranslationModel((stage) => {
            if (stage === 'removing') removeTranslationModelBtn.textContent = 'Removing model…';
        });
        toastSuccess(removed ? 'Removed the downloaded translation model.' : 'No downloaded translation model was found.');
    } catch (error) {
        toastError(`Could not remove model: ${error.message || error}`);
    } finally {
        removeTranslationModelBtn.disabled = false;
        removeTranslationModelBtn.textContent = label;
    }
}

// ---------- File uploads ----------

function describeFile(area, file) {
    const titleEl = area.querySelector('.dz-title');
    titleEl.textContent = file.name;
    // Long names are truncated with CSS ellipsis — expose the full name on hover.
    titleEl.title = file.name;
    area.querySelector('.dz-hint').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    area.dataset.loaded = 'true';
}

function resetDropZone(area, input, defaults) {
    const titleEl = area.querySelector('.dz-title');
    titleEl.textContent = defaults.title;
    titleEl.removeAttribute('title');
    area.querySelector('.dz-hint').textContent = defaults.hint;
    delete area.dataset.loaded;
    input.value = '';
}

function wireUpload(area, input, onFile) {
    const setDrag = (on) => area.dataset.drag = on ? 'true' : 'false';
    area.addEventListener('dragover',  (e) => { e.preventDefault(); setDrag(true); });
    area.addEventListener('dragleave', (e) => { e.preventDefault(); setDrag(false); });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            onFile(e.dataTransfer.files[0]);
        }
    });
    input.addEventListener('change', () => {
        if (input.files.length > 0) onFile(input.files[0]);
    });
}

function handleAlbumArt(file) {
    describeFile(uploadArea, file);
    if (lastAlbumArtObjectUrl) URL.revokeObjectURL(lastAlbumArtObjectUrl);
    const imageUrl = URL.createObjectURL(file);
    lastAlbumArtObjectUrl = imageUrl;
    emit(Events.UPDATE_ALBUM_ART, imageUrl);
}

async function generateAlbumArt() {
    const prompt = aiArtPrompt.value.trim();
    if (!prompt) return toastInfo('Describe the cover art first.');
    if (!await confirmDialog({
        dialogTitle: 'Generate cover art?',
        dialogMessage: 'This sends your cover prompt to Pollinations to generate an image.',
        confirmLabel: 'Generate',
    })) return;
    aiArtBtn.disabled = true;
    aiArtPrompt.disabled = true;
    aiArtBtn.textContent = 'Generating…';
    aiArtPanel.setAttribute('aria-busy', 'true');
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Image service returned ${response.status}.`);
        const blob = await response.blob();
        if (lastAlbumArtObjectUrl) URL.revokeObjectURL(lastAlbumArtObjectUrl);
        lastAlbumArtObjectUrl = URL.createObjectURL(blob);
        emit(Events.UPDATE_ALBUM_ART, lastAlbumArtObjectUrl);
        toastSuccess('Generated cover art.');
    } catch (error) {
        toastError(`Could not generate cover: ${error.message || error}`);
    } finally {
        aiArtBtn.disabled = false;
        aiArtPrompt.disabled = false;
        aiArtBtn.textContent = 'Generate';
        aiArtPanel.removeAttribute('aria-busy');
    }
}

function handleAudioFile(file) {
    describeFile(audioUploadArea, file);
    if (lastAudioObjectUrl) URL.revokeObjectURL(lastAudioObjectUrl);
    const audioUrl = URL.createObjectURL(file);
    lastAudioObjectUrl = audioUrl;

    let albumArtUrl;
    const albumArtFile = albumArtInput.files[0];
    if (albumArtFile) {
        if (lastAlbumArtObjectUrl) URL.revokeObjectURL(lastAlbumArtObjectUrl);
        albumArtUrl = URL.createObjectURL(albumArtFile);
        lastAlbumArtObjectUrl = albumArtUrl;
    }

    emit(Events.PLAY_FILE, {
        audioUrl,
        songTitle: songTitleInput.value,
        artistName: artistNameInput.value,
        albumArtUrl,
    });
    refreshAudioDependentButtons();
    autofillId3Metadata(file);
}

async function suggestThemeFromAudio() {
    const file = audioFileInput.files[0];
    if (!file) return toastInfo('Add an audio file first.');
    suggestThemeBtn.disabled = true;
    const originalLabel = suggestThemeBtn.textContent;
    suggestThemeBtn.textContent = 'Analyzing locally…';
    try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextCtor();
        let audioBuffer;
        try {
            audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
        } finally {
            audioContext.close().catch(() => {});
        }
        const samples = audioBuffer.getChannelData(0);
        const limit = Math.min(samples.length, Math.floor(audioBuffer.sampleRate * 30));
        const step = Math.max(1, Math.floor(audioBuffer.sampleRate / 80));
        let power = 0, crossings = 0, count = 0, previous = samples[0] || 0;
        for (let i = 0; i < limit; i += step) {
            const value = samples[i];
            power += value * value;
            if ((value >= 0) !== (previous >= 0)) crossings++;
            previous = value;
            count++;
        }
        const energy = Math.sqrt(power / Math.max(1, count));
        const activity = crossings / Math.max(1, count);
        let palette = 'rose-noir', font = 'playfair-display', mood = 'calm';
        if (energy > 0.22 && activity > 0.2) {
            palette = 'neon-pop'; font = 'montserrat'; mood = 'energetic';
        } else if (energy > 0.14) {
            palette = 'sunset-glow'; font = 'oswald'; mood = 'upbeat';
        } else if (activity > 0.23) {
            palette = 'ocean-drift'; font = 'be-vietnam-pro'; mood = 'bright';
        }
        applyPaletteByKey(palette);
        setPlayerFont(font);
        toastSuccess(`Applied a ${mood} theme from the first 30 seconds.`);
    } catch {
        toastError("Couldn't analyze this audio file. Try a different format.");
    } finally {
        suggestThemeBtn.disabled = false;
        suggestThemeBtn.textContent = originalLabel;
    }
}

async function autofillId3Metadata(file) {
    try {
        const metadata = await readId3Metadata(file);
        // Ignore a slow read from a file that has since been replaced/cleared.
        if (audioFileInput.files[0] !== file) return;
        let filled = false;
        // Respect edits made before this asynchronous read finishes.
        if (metadata.title && !songTitleInput.value.trim()) {
            songTitleInput.value = metadata.title;
            emit(Events.UPDATE_SONG_TITLE, metadata.title);
            filled = true;
        }
        if (metadata.artist && !artistNameInput.value.trim()) {
            artistNameInput.value = metadata.artist;
            emit(Events.UPDATE_ARTIST_NAME, metadata.artist);
            filled = true;
        }
        if (metadata.cover && !albumArtInput.files[0]) {
            if (lastAlbumArtObjectUrl) URL.revokeObjectURL(lastAlbumArtObjectUrl);
            lastAlbumArtObjectUrl = URL.createObjectURL(metadata.cover);
            emit(Events.UPDATE_ALBUM_ART, lastAlbumArtObjectUrl);
            filled = true;
        }
        if (filled) toastInfo('Filled available title, artist, and cover from this audio file.');
    } catch {
        // Metadata is optional; malformed tags must never block playback.
    }
}

function clearAudio() {
    // A running transcription targets the file being removed — kill it.
    if (isAutoSyncRunning()) cancelAutoSync();
    resetDropZone(audioUploadArea, audioFileInput, {
        title: 'Drop or click',
        hint: 'MP3, WAV, OGG, M4A, AAC',
    });
    if (lastAudioObjectUrl) {
        URL.revokeObjectURL(lastAudioObjectUrl);
        lastAudioObjectUrl = null;
    }
    emit(Events.STOP_PLAYBACK);
    refreshAudioDependentButtons();
}

function clearAlbumArt() {
    resetDropZone(uploadArea, albumArtInput, {
        title: 'Drop image',
        hint: 'Used as label + ambient bg · JPG · PNG · WebP',
    });
    if (lastAlbumArtObjectUrl) {
        URL.revokeObjectURL(lastAlbumArtObjectUrl);
        lastAlbumArtObjectUrl = null;
    }
    emit(Events.CLEAR_ALBUM_ART);
    emit(Events.UPDATE_ALBUM_ART, null); // theme.js → reset accent
}

// ---------- Form bindings ----------

function bindInputs() {
    songTitleInput.addEventListener('input', () => {
        emit(Events.UPDATE_SONG_TITLE, songTitleInput.value);
        refreshAudioDependentButtons();
    });
    artistNameInput.addEventListener('input', () => {
        emit(Events.UPDATE_ARTIST_NAME, artistNameInput.value);
    });
}

// ---------- Export UI ----------

function refreshAudioDependentButtons() {
    const hasAudio = !!audioFileInput.files[0];
    exportBtn.disabled = !hasAudio;
    // Auto-sync transcribes the same upload — no audio, nothing to sync.
    autoSyncBtn.disabled = !hasAudio;
}

function refreshAudioDependentButtonsLabel() {
    const { ext } = FORMATS[state.videoFormat] || FORMATS.webm;
    exportBtnLabel.textContent = `Export ${ext.slice(1).toUpperCase()}`;
}

function resetExportProgress() {
    exportBtn.classList.remove('exporting');
    exportBtnFill.style.width = '0%';
    refreshAudioDependentButtonsLabel();
    refreshAudioDependentButtons();
}

function handleExportComplete({ videoBlob, fileName }) {
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    resetExportProgress();
    toastSuccess(`${fileName.endsWith('.mp4') ? 'MP4' : 'WebM'} saved.`);
}

function bindExport() {
    let exportStartedAt = 0;

    exportBtn.addEventListener('click', () => {
        // Mid-export the button is the cancel control. A short grace period
        // keeps an accidental double-click on "Export" from instantly
        // cancelling the run it just started.
        if (state.isExporting) {
            if (performance.now() - exportStartedAt > 500) emit(Events.EXPORT_CANCEL);
            return;
        }

        const audioFile = audioFileInput.files[0];
        const songTitle = songTitleInput.value.trim();
        const artistName = artistNameInput.value.trim();
        const albumArtFile = albumArtInput.files[0];
        const rangeStart = timeToSeconds(exportStartInput.value || '00:00');
        const rangeEnd = exportEndInput.value ? timeToSeconds(exportEndInput.value) : null;

        if (!audioFile) {
            toastError('Upload an audio file first.');
            return;
        }
        if ((exportStartInput.value && !TIME_PATTERN.test(exportStartInput.value))
            || (exportEndInput.value && !TIME_PATTERN.test(exportEndInput.value))
            || (rangeEnd !== null && rangeEnd <= rangeStart)
            || (state.totalTime && (rangeStart >= state.totalTime || (rangeEnd !== null && rangeEnd > state.totalTime)))) {
            toastError('Use a valid export range within the track (mm:ss).');
            return;
        }

        // Whisper and the 30fps recorder would fight over the CPU and the
        // export would drop frames — the export wins, the sync dies.
        if (isAutoSyncRunning()) cancelAutoSync();

        exportStartedAt = performance.now();
        exportBtn.classList.add('exporting');
        exportBtnLabel.textContent = 'Preparing…';

        emit(Events.EXPORT_REQUESTED, { audioFile, songTitle, artistName, albumArtFile, rangeStart, rangeEnd });
    });

    debugBtn.addEventListener('click', () => emit(Events.DEBUG_BROWSER_SUPPORT));

    on(Events.EXPORT_PROGRESS, ({ progress, message }) => {
        exportBtnFill.style.width = `${progress}%`;
        exportBtnLabel.textContent = message;
    });
    on(Events.EXPORT_COMPLETE, handleExportComplete);
    on(Events.EXPORT_ERROR, (error) => {
        toastError(`Export failed: ${error}`);
        resetExportProgress();
    });
    on(Events.EXPORT_CANCELLED, () => {
        toastInfo('Export cancelled.');
        resetExportProgress();
    });
}

// ---------- Modal ----------

function bindImportModal() {
    devLyricsBtn.addEventListener('click', openImportModal);
    exportLrcBtn.addEventListener('click', exportLrc);
    findLyricsBtn.addEventListener('click', handleFindLyrics);
    modalCloseBtn.addEventListener('click', closeImportModal);
    modalCancelBtn.addEventListener('click', closeImportModal);
    modalImportBtn.addEventListener('click', importLyricsFromJson);
    importModeReplaceBtn.addEventListener('click', () => setImportMode('replace'));
    importModeAppendBtn.addEventListener('click', () => setImportMode('append'));
    devLyricsModal.addEventListener('click', (e) => {
        if (e.target === devLyricsModal) closeImportModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !devLyricsModal.hidden) closeImportModal();
    });
}

// ---------- Aspect ratio ----------

function setAspectRatio(ratio, { persist = true } = {}) {
    if (!RATIOS[ratio]) return;
    // Mid-export the frame geometry is locked — the export computed its layer
    // rects at start; resizing the frame now would corrupt the video.
    if (state.isExporting) {
        toastInfo('Aspect ratio is locked while exporting.');
        return;
    }
    state.aspectRatio = ratio;
    const { w, h, label } = RATIOS[ratio];
    const [rw, rh] = ratio.split(':');

    // Update toggle visual state
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        const active = btn.dataset.ratio === ratio;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
    });

    // Update help text + frame aspect-ratio
    const help = document.getElementById('ratio-help');
    if (help) help.textContent = `${w}×${h} · ${label}`;

    const frame = document.querySelector('.frame');
    if (frame) {
        frame.style.setProperty('--ratio-w', rw);
        frame.style.setProperty('--ratio-h', rh);
        frame.setAttribute('aria-label', `Video preview (${ratio}, ${w}×${h})`);
    }

    if (persist) {
        try { localStorage.setItem('aspectRatio', ratio); } catch {}
    }

    emit(Events.UPDATE_ASPECT_RATIO, ratio);
}

function loadPersistedRatio() {
    try {
        const saved = localStorage.getItem('aspectRatio');
        if (saved && RATIOS[saved]) return saved;
    } catch {}
    return DEFAULT_ASPECT_RATIO;
}

function bindRatioToggle() {
    document.querySelectorAll('.ratio-btn[data-ratio]').forEach(btn => {
        btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio));
    });
}

// ---------- Video format ----------

function formatSupported(fmt) {
    return !!window.MediaRecorder &&
        FORMATS[fmt].candidates.some(t => MediaRecorder.isTypeSupported(t));
}

function setVideoFormat(fmt, { persist = true } = {}) {
    if (!FORMATS[fmt]) return;
    // The recorder picked its mime type at start — switching now would lie
    // about what's being recorded.
    if (state.isExporting) {
        toastInfo('Video format is locked while exporting.');
        return;
    }
    state.videoFormat = fmt;

    document.querySelectorAll('.format-btn').forEach(btn => {
        const active = btn.dataset.format === fmt;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active);
    });

    const { ext, label } = FORMATS[fmt];

    const help = document.getElementById('format-help');
    if (help) help.textContent = `${ext.slice(1).toUpperCase()} · ${label}`;

    // Keep the export button's label in sync with the chosen container.
    refreshAudioDependentButtonsLabel();

    if (persist) {
        try { localStorage.setItem('videoFormat', fmt); } catch {}
    }
}

function loadPersistedFormat() {
    try {
        const saved = localStorage.getItem('videoFormat');
        // Re-check support — the saved choice may come from another browser
        // profile or a since-downgraded one.
        if (saved && FORMATS[saved] && formatSupported(saved)) return saved;
    } catch {}
    return formatSupported('mp4') ? 'mp4' : DEFAULT_VIDEO_FORMAT;
}

function bindFormatToggle() {
    document.querySelectorAll('.format-btn').forEach(btn => {
        const fmt = btn.dataset.format;
        if (!formatSupported(fmt)) {
            btn.disabled = true;
            btn.title = 'Not supported by this browser';
            return;
        }
        btn.addEventListener('click', () => setVideoFormat(fmt));
    });
}

// ---------- Init ----------

export function initSettings() {
    // No submit button exists, but block implicit submission anyway — a stray
    // Enter must never reload the page and wipe the user's session.
    document.getElementById('musicForm')?.addEventListener('submit', (e) => e.preventDefault());

    refreshLyricsEmptyState();
    bindReorderContainer();

    addLyricsBtn.addEventListener('click', () => {
        const item = addLyricsLine(nextLineSeed());
        // Times are pre-filled — jump straight to typing the lyric.
        item.querySelector('.lyrics-text-input')?.focus();
    });
    clearLyricsBtn.addEventListener('click', clearAllLyrics);
    autoSyncBtn.addEventListener('click', handleAutoSync);
    translateLyricsBtn.addEventListener('click', handleTranslateLyrics);
    removeTranslationModelBtn.addEventListener('click', handleRemoveTranslationModel);
    try { whisperModelInput.value = localStorage.getItem('whisperModel') || 'tiny'; } catch {}
    whisperModelInput.addEventListener('change', () => {
        try { localStorage.setItem('whisperModel', whisperModelInput.value); } catch {}
        if (whisperModelInput.value === 'small') toastInfo('Small model downloads about 250 MB on first use.');
    });

    wireUpload(uploadArea, albumArtInput, handleAlbumArt);
    wireUpload(audioUploadArea, audioFileInput, handleAudioFile);

    audioClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearAudio(); });
    albumArtClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearAlbumArt(); });
    aiArtBtn.addEventListener('click', generateAlbumArt);

    bindImportModal();
    bindInputs();
    bindExport();
    bindRatioToggle();
    setAspectRatio(loadPersistedRatio(), { persist: false });
    bindFormatToggle();
    setVideoFormat(loadPersistedFormat(), { persist: false });
    try { state.visualizerEnabled = localStorage.getItem('visualizerEnabled') === 'true'; } catch {}
    visualizerEnabledInput.checked = state.visualizerEnabled;
    visualizerEnabledInput.addEventListener('change', () => {
        state.visualizerEnabled = visualizerEnabledInput.checked;
        try { localStorage.setItem('visualizerEnabled', String(state.visualizerEnabled)); } catch {}
    });
    suggestThemeBtn.addEventListener('click', suggestThemeFromAudio);

    audioFileInput.addEventListener('change', refreshAudioDependentButtons);
    songTitleInput.addEventListener('input', refreshAudioDependentButtons);
    [exportStartInput, exportEndInput].forEach(input => input?.addEventListener('blur', () => {
        const normalized = normalizeTimeString(input.value);
        if (normalized !== null) input.value = normalized;
    }));

    initColorManager();
    initFontManager();
}
