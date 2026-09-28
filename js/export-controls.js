import { emit, on, Events } from './lib/events.js';
import { state, FORMATS } from './lib/state.js';
import { timeToSeconds } from './lib/format.js';
import { toastSuccess, toastError, toastInfo } from './toast.js';

const TIME_PATTERN = /^[0-9]{1,2}:[0-9]{2}$/;

export function initExportControls({
    audioFileInput,
    albumArtInput,
    songTitleInput,
    artistNameInput,
    exportBtn,
    debugBtn,
    exportBtnFill,
    exportBtnLabel,
    exportStartInput,
    exportEndInput,
    isAutoSyncRunning,
    cancelAutoSync,
}) {
    function refreshAvailability() {
        exportBtn.disabled = !audioFileInput.files[0];
    }

    function refreshLabel() {
        const { ext } = FORMATS[state.videoFormat] || FORMATS.webm;
        exportBtnLabel.textContent = `Export ${ext.slice(1).toUpperCase()}`;
    }

    function resetProgress() {
        exportBtn.classList.remove('exporting');
        exportBtnFill.style.width = '0%';
        refreshLabel();
        refreshAvailability();
    }

    function downloadExport({ videoBlob, fileName }) {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        resetProgress();
        toastSuccess(`${fileName.endsWith('.mp4') ? 'MP4' : 'WebM'} saved.`);
    }

    let exportStartedAt = 0;
    exportBtn.addEventListener('click', () => {
        if (state.isExporting) {
            if (performance.now() - exportStartedAt > 500) emit(Events.EXPORT_CANCEL);
            return;
        }

        const audioFile = audioFileInput.files[0];
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

        if (isAutoSyncRunning()) cancelAutoSync();

        exportStartedAt = performance.now();
        exportBtn.classList.add('exporting');
        exportBtnLabel.textContent = 'Preparing…';
        emit(Events.EXPORT_REQUESTED, {
            audioFile,
            songTitle: songTitleInput.value.trim(),
            artistName: artistNameInput.value.trim(),
            albumArtFile: albumArtInput.files[0],
            rangeStart,
            rangeEnd,
        });
    });

    debugBtn.addEventListener('click', () => emit(Events.DEBUG_BROWSER_SUPPORT));
    on(Events.EXPORT_PROGRESS, ({ progress, message }) => {
        exportBtnFill.style.width = `${progress}%`;
        exportBtnLabel.textContent = message;
    });
    on(Events.EXPORT_COMPLETE, downloadExport);
    on(Events.EXPORT_ERROR, (error) => {
        toastError(`Export failed: ${error}`);
        resetProgress();
    });
    on(Events.EXPORT_CANCELLED, () => {
        toastInfo('Export cancelled.');
        resetProgress();
    });

    refreshAvailability();
    refreshLabel();
    return { refreshAvailability, refreshLabel };
}
