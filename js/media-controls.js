import { emit, Events } from './lib/events.js';
import { readId3Metadata } from './id3.js';
import { confirmDialog } from './dialog.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

function describe(area, file) {
    const title = area.querySelector('.dz-title');
    title.textContent = file.name;
    title.title = file.name;
    area.querySelector('.dz-hint').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    area.dataset.loaded = 'true';
}

function wireUpload(area, input, onFile) {
    const drag = value => { area.dataset.drag = value ? 'true' : 'false'; };
    area.addEventListener('dragover', event => { event.preventDefault(); drag(true); });
    area.addEventListener('dragleave', event => { event.preventDefault(); drag(false); });
    area.addEventListener('drop', event => {
        event.preventDefault(); drag(false);
        if (event.dataTransfer.files.length) {
            input.files = event.dataTransfer.files;
            onFile(input.files[0]);
        }
    });
    input.addEventListener('change', () => { if (input.files.length) onFile(input.files[0]); });
}

export function initMediaControls({
    uploadArea, albumArtInput, audioUploadArea, audioFileInput, songTitleInput,
    artistNameInput, audioClearBtn, albumArtClearBtn, aiArtPrompt, aiArtBtn,
    onAudioChanged, cancelAutoSync, isAutoSyncRunning,
}) {
    let audioUrl = null;
    let albumArtUrl = null;
    const artPanel = aiArtBtn.closest('.cover-generator-panel');
    const reset = (area, input, title, hint) => {
        area.querySelector('.dz-title').textContent = title;
        area.querySelector('.dz-title').removeAttribute('title');
        area.querySelector('.dz-hint').textContent = hint;
        delete area.dataset.loaded;
        input.value = '';
    };
    const setArt = file => {
        if (file.name) describe(uploadArea, file);
        if (albumArtUrl) URL.revokeObjectURL(albumArtUrl);
        albumArtUrl = URL.createObjectURL(file);
        emit(Events.UPDATE_ALBUM_ART, albumArtUrl);
    };
    const fillId3 = async file => {
        try {
            const metadata = await readId3Metadata(file);
            if (audioFileInput.files[0] !== file) return;
            let filled = false;
            if (metadata.title && !songTitleInput.value.trim()) { songTitleInput.value = metadata.title; emit(Events.UPDATE_SONG_TITLE, metadata.title); filled = true; }
            if (metadata.artist && !artistNameInput.value.trim()) { artistNameInput.value = metadata.artist; emit(Events.UPDATE_ARTIST_NAME, metadata.artist); filled = true; }
            if (metadata.cover && !albumArtInput.files[0]) { if (albumArtUrl) URL.revokeObjectURL(albumArtUrl); albumArtUrl = URL.createObjectURL(metadata.cover); emit(Events.UPDATE_ALBUM_ART, albumArtUrl); filled = true; }
            if (filled) toastInfo('Filled available title, artist, and cover from this audio file.');
        } catch {}
    };
    const setAudio = file => {
        describe(audioUploadArea, file);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        audioUrl = URL.createObjectURL(file);
        emit(Events.PLAY_FILE, { audioUrl, songTitle: songTitleInput.value, artistName: artistNameInput.value, albumArtUrl });
        onAudioChanged();
        fillId3(file);
    };
    wireUpload(uploadArea, albumArtInput, setArt);
    wireUpload(audioUploadArea, audioFileInput, setAudio);
    audioClearBtn.addEventListener('click', event => {
        event.stopPropagation();
        if (isAutoSyncRunning()) cancelAutoSync();
        reset(audioUploadArea, audioFileInput, 'Drop or click', 'MP3, WAV, OGG, M4A, AAC');
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        audioUrl = null; emit(Events.STOP_PLAYBACK); onAudioChanged();
    });
    albumArtClearBtn.addEventListener('click', event => {
        event.stopPropagation(); reset(uploadArea, albumArtInput, 'Drop image', 'Used as label + ambient bg · JPG · PNG · WebP');
        if (albumArtUrl) URL.revokeObjectURL(albumArtUrl);
        albumArtUrl = null; emit(Events.CLEAR_ALBUM_ART); emit(Events.UPDATE_ALBUM_ART, null);
    });
    songTitleInput.addEventListener('input', () => { emit(Events.UPDATE_SONG_TITLE, songTitleInput.value); onAudioChanged(); });
    artistNameInput.addEventListener('input', () => emit(Events.UPDATE_ARTIST_NAME, artistNameInput.value));
    aiArtBtn.addEventListener('click', async () => {
        const prompt = aiArtPrompt.value.trim();
        if (!prompt) return toastInfo('Describe the cover art first.');
        if (!await confirmDialog({ dialogTitle: 'Generate cover art?', dialogMessage: 'This sends your cover prompt to Pollinations to generate an image.', confirmLabel: 'Generate' })) return;
        aiArtBtn.disabled = aiArtPrompt.disabled = true; aiArtBtn.textContent = 'Generating…'; artPanel.setAttribute('aria-busy', 'true');
        try { const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`); if (!response.ok) throw new Error(`Image service returned ${response.status}.`); setArt(await response.blob()); toastSuccess('Generated cover art.'); }
        catch (error) { toastError(`Could not generate cover: ${error.message || error}`); }
        finally { aiArtBtn.disabled = aiArtPrompt.disabled = false; aiArtBtn.textContent = 'Generate'; artPanel.removeAttribute('aria-busy'); }
    });
}
