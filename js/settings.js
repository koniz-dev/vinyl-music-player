import { emit, on, Events } from './lib/events.js';
import { timeToSeconds, formatTime } from './lib/format.js';
import { initColorManager } from './color-manager.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';
import { icon } from './icons.js';
import { state, RATIOS, DEFAULT_ASPECT_RATIO, FORMATS, DEFAULT_VIDEO_FORMAT } from './lib/state.js';
import { runAutoSync, cancelAutoSync, isAutoSyncRunning } from './autosync.js';

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
const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportBtnFill = document.getElementById('export-btn-fill');
const exportBtnLabel = document.getElementById('export-btn-label');

// ---------- Lyrics editor ----------

function buildLyricsItem({ start = '', end = '', text = '' } = {}) {
    lyricsCount++;

    const item = document.createElement('div');
    item.className = 'lyrics-item';

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
        data.push({ start, end, text });
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
        const rows = JSON.parse(raw);
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

        if (!audioFile) {
            toastError('Upload an audio file first.');
            return;
        }

        // Whisper and the 30fps recorder would fight over the CPU and the
        // export would drop frames — the export wins, the sync dies.
        if (isAutoSyncRunning()) cancelAutoSync();

        exportStartedAt = performance.now();
        exportBtn.classList.add('exporting');
        exportBtnLabel.textContent = 'Preparing…';

        emit(Events.EXPORT_REQUESTED, { audioFile, songTitle, artistName, albumArtFile });
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

    wireUpload(uploadArea, albumArtInput, handleAlbumArt);
    wireUpload(audioUploadArea, audioFileInput, handleAudioFile);

    audioClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearAudio(); });
    albumArtClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearAlbumArt(); });

    bindImportModal();
    bindInputs();
    bindExport();
    bindRatioToggle();
    setAspectRatio(loadPersistedRatio(), { persist: false });
    bindFormatToggle();
    setVideoFormat(loadPersistedFormat(), { persist: false });

    audioFileInput.addEventListener('change', refreshAudioDependentButtons);
    songTitleInput.addEventListener('input', refreshAudioDependentButtons);

    initColorManager();
}
