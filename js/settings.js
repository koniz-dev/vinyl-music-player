import { emit, on, Events } from './lib/events.js';
import { timeToSeconds } from './lib/format.js';
import { initColorManager } from './color-manager.js';

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

// ---------- Lyrics form ----------

function buildLyricsItem({ start = '', end = '', text = '' } = {}) {
    lyricsCount++;

    const item = document.createElement('div');
    item.className = 'lyrics-item';

    const header = document.createElement('div');
    header.className = 'lyrics-item-header';

    const title = document.createElement('div');
    title.className = 'lyrics-item-title';
    title.textContent = `Lyrics ${lyricsCount}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-lyrics-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        item.remove();
        publishLyrics();
    });

    header.append(title, removeBtn);

    const inputs = document.createElement('div');
    inputs.className = 'lyrics-inputs';
    inputs.append(
        buildField({ labelText: 'Start Time (mm:ss)', placeholder: '00:00', value: start,
                     inputClass: 'time-input', labelClass: 'time-label', pattern: '[0-9]{1,2}:[0-9]{2}' }),
        buildField({ labelText: 'End Time (mm:ss)', placeholder: '00:05', value: end,
                     inputClass: 'time-input', labelClass: 'time-label', pattern: '[0-9]{1,2}:[0-9]{2}' }),
        buildField({ labelText: 'Lyrics Content', placeholder: 'Enter lyrics...', value: text,
                     inputClass: 'lyrics-text-input', labelClass: 'lyrics-label' })
    );

    item.append(header, inputs);
    return item;
}

function buildField({ labelText, placeholder, value, inputClass, labelClass, pattern }) {
    const wrap = document.createElement('div');

    const label = document.createElement('div');
    label.className = labelClass;
    label.textContent = labelText;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = inputClass;
    input.placeholder = placeholder;
    input.value = value;
    if (pattern) input.pattern = pattern;
    input.addEventListener('input', publishLyrics);

    wrap.append(label, input);
    return wrap;
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

function validateImportedLyrics(rows) {
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of objects');

    rows.forEach((row, i) => {
        if (typeof row !== 'object' || row === null) {
            throw new Error(`Item at index ${i} must be an object`);
        }
        if (typeof row.start !== 'string' || typeof row.end !== 'string' || typeof row.text !== 'string') {
            throw new Error(`Item at index ${i} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
        }
        if (!TIME_PATTERN.test(row.start) || !TIME_PATTERN.test(row.end)) {
            throw new Error(`Item at index ${i} has invalid time format. Use mm:ss format (e.g., "01:30")`);
        }
        if (timeToSeconds(row.start) >= timeToSeconds(row.end)) {
            throw new Error(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
        }
    });
}

function closeImportModal() {
    devLyricsModal.style.display = 'none';
    jsonLyricsInput.value = '';
}

function importLyricsFromJson() {
    const raw = jsonLyricsInput.value.trim();
    if (!raw) {
        alert('Please paste your JSON lyrics first.');
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
        alert(`Successfully imported ${rows.length} lyrics items!`);
    } catch (error) {
        alert('Error parsing JSON: ' + error.message);
    }
}

// ---------- File uploads ----------

function describeFile(area, file) {
    area.querySelector('.upload-text').textContent = file.name;
    area.querySelector('.upload-hint').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    area.style.borderColor = '#38a169';
    area.style.background = 'rgba(56, 161, 105, 0.05)';
}

function highlightDrag(area, dragging) {
    area.style.borderColor = dragging ? '#667eea' : '#cbd5e0';
    area.style.background = dragging ? 'rgba(102, 126, 234, 0.1)' : '#f7fafc';
}

function wireUpload(area, input, onFile) {
    area.addEventListener('dragover', (e) => { e.preventDefault(); highlightDrag(area, true); });
    area.addEventListener('dragleave', (e) => { e.preventDefault(); highlightDrag(area, false); });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        highlightDrag(area, false);
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
    exportProgress.style.display = 'none';
    exportBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing export...';
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
    alert('WebM video exported successfully!');

    setTimeout(() => { isExportCompleted = false; }, 2000);
}

function bindExport() {
    exportBtn.addEventListener('click', () => {
        const audioFile = audioFileInput.files[0];
        const songTitle = songTitleInput.value.trim();
        const artistName = artistNameInput.value.trim();
        const albumArtFile = albumArtInput.files[0];

        if (!audioFile || !songTitle) {
            alert('Please upload an audio file and enter a song title before exporting.');
            return;
        }

        exportProgress.style.display = 'block';
        exportBtn.disabled = true;
        setTimeout(() => {
            exportProgress.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        emit(Events.EXPORT_REQUESTED, { audioFile, songTitle, artistName, albumArtFile });
    });

    debugBtn.addEventListener('click', () => emit(Events.DEBUG_BROWSER_SUPPORT));

    on(Events.EXPORT_PROGRESS, ({ progress, message }) => {
        progressFill.style.width = `${progress}%`;
        progressText.textContent = message;
    });
    on(Events.EXPORT_COMPLETE, handleExportComplete);
    on(Events.EXPORT_ERROR, (error) => {
        alert('Export failed: ' + error);
        resetExportProgress();
    });
}

// ---------- Modal ----------

function bindImportModal() {
    devLyricsBtn.addEventListener('click', () => {
        devLyricsModal.style.display = 'flex';
        jsonLyricsInput.focus();
    });
    modalCloseBtn.addEventListener('click', closeImportModal);
    modalCancelBtn.addEventListener('click', closeImportModal);
    modalImportBtn.addEventListener('click', importLyricsFromJson);
    devLyricsModal.addEventListener('click', (e) => {
        if (e.target === devLyricsModal) closeImportModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && devLyricsModal.style.display === 'flex') closeImportModal();
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
