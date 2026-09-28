import { emit, Events } from './lib/events.js';
import { timeToSeconds, formatTime } from './lib/format.js';
import { initColorManager, applyPaletteByKey } from './color-manager.js';
import { initFontManager, setPlayerFont } from './font-manager.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { icon } from './icons.js';
import { state } from './lib/state.js';
import { initOutputSettings } from './output-settings.js';
import { initExportControls } from './export-controls.js';
import { initMediaControls } from './media-controls.js';
import { initTranslationControls } from './translation-controls.js';
import { initAutoSyncControls } from './autosync-controls.js';
import { initLyricsImportControls } from './lyrics-import-controls.js';
import { cancelAutoSync, isAutoSyncRunning } from './autosync.js';

let lyricsCount = 0;

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
const visualizerEnabledInput = document.getElementById('visualizer-enabled');
const suggestThemeBtn = document.getElementById('suggest-theme-btn');
const exportLrcBtn = document.getElementById('export-lrc-btn');
const findLyricsBtn = document.getElementById('find-lyrics-btn');
const translateLyricsBtn = document.getElementById('translate-lyrics-btn');
const translationDirectionInput = document.getElementById('translation-direction');
const removeTranslationModelBtn = document.getElementById('remove-translation-model-btn');
const exportStartInput = document.getElementById('export-start');
const exportEndInput = document.getElementById('export-end');

let exportControls = null;

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

// ---------- Export UI ----------

function refreshAudioDependentButtons() {
    exportControls?.refreshAvailability();
    // Auto-sync transcribes the same upload — no audio, nothing to sync.
    autoSyncBtn.disabled = !audioFileInput.files[0];
}

function refreshAudioDependentButtonsLabel() {
    exportControls?.refreshLabel();
}

// ---------- Modal ----------

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
    initAutoSyncControls({
        button: autoSyncBtn,
        label: autoSyncLabel,
        status: autoSyncStatus,
        pastedLyricsInput: autoSyncInput,
        modelInput: whisperModelInput,
        audioFileInput,
        songTitleInput,
        artistNameInput,
        getItems: () => [...lyricsContainer.querySelectorAll('.lyrics-item')],
        replaceItems: rows => {
            lyricsContainer.replaceChildren();
            lyricsCount = 0;
            rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
            refreshLyricsEmptyState();
        },
        appendItem: row => {
            lyricsContainer.appendChild(buildLyricsItem(row));
            refreshLyricsEmptyState();
        },
        publishLyrics,
    });
    initTranslationControls({
        translateButton: translateLyricsBtn,
        directionInput: translationDirectionInput,
        removeModelButton: removeTranslationModelBtn,
        getItems: () => [...lyricsContainer.querySelectorAll('.lyrics-item')],
        publishLyrics,
    });
    try { whisperModelInput.value = localStorage.getItem('whisperModel') || 'tiny'; } catch {}
    whisperModelInput.addEventListener('change', () => {
        try { localStorage.setItem('whisperModel', whisperModelInput.value); } catch {}
        if (whisperModelInput.value === 'small') toastInfo('Small model downloads about 250 MB on first use.');
    });

    initLyricsImportControls({
        openButton: devLyricsBtn,
        exportButton: exportLrcBtn,
        findButton: findLyricsBtn,
        modal: devLyricsModal,
        closeButton: modalCloseBtn,
        cancelButton: modalCancelBtn,
        importButton: modalImportBtn,
        sourceInput: jsonLyricsInput,
        replaceButton: importModeReplaceBtn,
        appendButton: importModeAppendBtn,
        overwriteWarning: importOverwriteWarning,
        overwriteCount: importOverwriteCount,
        songTitleInput,
        artistNameInput,
        getLyrics: () => state.lyrics,
        getItemCount: () => lyricsContainer.children.length,
        replaceRows: rows => {
            lyricsContainer.replaceChildren();
            lyricsCount = 0;
            rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
            refreshLyricsEmptyState();
        },
        appendRows: rows => {
            rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));
            refreshLyricsEmptyState();
        },
        publishLyrics,
        totalTime: () => state.totalTime,
    });
    exportControls = initExportControls({
        audioFileInput,
        albumArtInput,
        songTitleInput,
        artistNameInput,
        exportBtn: document.getElementById('export-btn'),
        debugBtn: document.getElementById('debug-btn'),
        exportBtnFill: document.getElementById('export-btn-fill'),
        exportBtnLabel: document.getElementById('export-btn-label'),
        exportStartInput,
        exportEndInput,
        isAutoSyncRunning,
        cancelAutoSync,
    });
    refreshAudioDependentButtons();
    initMediaControls({
        uploadArea, albumArtInput, audioUploadArea, audioFileInput, songTitleInput,
        artistNameInput, audioClearBtn, albumArtClearBtn, aiArtPrompt, aiArtBtn,
        onAudioChanged: refreshAudioDependentButtons, cancelAutoSync, isAutoSyncRunning,
    });
    initOutputSettings({ onFormatChanged: refreshAudioDependentButtonsLabel });
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
