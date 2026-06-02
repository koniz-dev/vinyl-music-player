import { emit, on, Events } from './lib/events.js';
import { timeToSeconds } from './lib/format.js';
import { initColorManager } from './color-manager.js';
import { toastSuccess, toastError } from './toast.js';

const TIME_PATTERN = /^[0-9]{1,2}:[0-9]{2}$/;

let lyricsCount = 0;
let lastAudioObjectUrl = null;
let lastAlbumArtObjectUrl = null;

const lyricsContainer = document.getElementById('lyrics-container');
const addLyricsBtn = document.getElementById('add-lyrics-btn');
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
const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportProgress = document.getElementById('export-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// ---------- Lyrics editor ----------

function buildLyricsItem({ start = '', end = '', text = '' } = {}) {
    lyricsCount++;

    const item = document.createElement('div');
    item.className = 'lyrics-item';

    const header = document.createElement('div');
    header.className = 'lyrics-item-header';

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
    });

    header.append(title, removeBtn);

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
    return input;
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

function openImportModal() {
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
        toastError('Paste some JSON first.');
        return;
    }
    try {
        const rows = JSON.parse(raw);
        validateImportedLyrics(rows);

        lyricsContainer.replaceChildren();
        lyricsCount = 0;
        rows.forEach(row => lyricsContainer.appendChild(buildLyricsItem(row)));

        publishLyrics();
        closeImportModal();
        toastSuccess(`Imported ${rows.length} lyric lines.`);
    } catch (error) {
        toastError(error.message);
    }
}

// ---------- File uploads ----------

function describeFile(area, file) {
    area.querySelector('.dz-title').textContent = file.name;
    area.querySelector('.dz-hint').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    area.dataset.loaded = 'true';
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
    refreshExportButton();
}

// ---------- Form bindings ----------

function bindInputs() {
    songTitleInput.addEventListener('input', () => {
        emit(Events.UPDATE_SONG_TITLE, songTitleInput.value);
        refreshExportButton();
    });
    artistNameInput.addEventListener('input', () => {
        emit(Events.UPDATE_ARTIST_NAME, artistNameInput.value);
    });
}

// ---------- Export UI ----------

function refreshExportButton() {
    const ready = !!audioFileInput.files[0] && !!songTitleInput.value.trim();
    exportBtn.disabled = !ready;
}

function resetExportProgress() {
    exportProgress.hidden = true;
    exportBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing…';
}

let isExportCompleted = false;
function handleExportComplete({ videoBlob, fileName }) {
    if (isExportCompleted) return;
    isExportCompleted = true;

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    resetExportProgress();
    toastSuccess('WebM saved.');

    setTimeout(() => { isExportCompleted = false; }, 2000);
}

function bindExport() {
    exportBtn.addEventListener('click', () => {
        const audioFile = audioFileInput.files[0];
        const songTitle = songTitleInput.value.trim();
        const artistName = artistNameInput.value.trim();
        const albumArtFile = albumArtInput.files[0];

        if (!audioFile || !songTitle) {
            toastError('Add an audio file and a song title first.');
            return;
        }

        exportProgress.hidden = false;
        exportBtn.disabled = true;

        emit(Events.EXPORT_REQUESTED, { audioFile, songTitle, artistName, albumArtFile });
    });

    debugBtn.addEventListener('click', () => emit(Events.DEBUG_BROWSER_SUPPORT));

    on(Events.EXPORT_PROGRESS, ({ progress, message }) => {
        progressFill.style.width = `${progress}%`;
        progressText.textContent = message;
    });
    on(Events.EXPORT_COMPLETE, handleExportComplete);
    on(Events.EXPORT_ERROR, (error) => {
        toastError(`Export failed: ${error}`);
        resetExportProgress();
    });
}

// ---------- Modal ----------

function bindImportModal() {
    devLyricsBtn.addEventListener('click', openImportModal);
    modalCloseBtn.addEventListener('click', closeImportModal);
    modalCancelBtn.addEventListener('click', closeImportModal);
    modalImportBtn.addEventListener('click', importLyricsFromJson);
    devLyricsModal.addEventListener('click', (e) => {
        if (e.target === devLyricsModal) closeImportModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !devLyricsModal.hidden) closeImportModal();
    });
}

// ---------- Init ----------

export function initSettings() {
    lyricsContainer.appendChild(buildLyricsItem());

    addLyricsBtn.addEventListener('click', () => {
        lyricsContainer.appendChild(buildLyricsItem());
    });

    wireUpload(uploadArea, albumArtInput, handleAlbumArt);
    wireUpload(audioUploadArea, audioFileInput, handleAudioFile);

    bindImportModal();
    bindInputs();
    bindExport();

    audioFileInput.addEventListener('change', refreshExportButton);
    songTitleInput.addEventListener('input', refreshExportButton);

    initColorManager();
}
