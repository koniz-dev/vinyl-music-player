class SettingsManager extends BaseModule {
    constructor() {
        super('SettingsManager');
        this.fileUtils = window.FileUtils;
        this.timeUtils = window.TimeUtils;
        
        this.lyricsContainer = null;
        this.lyricsColorManager = null;
        this.updateTimeouts = new Map(); // Per-input debouncing
        
        this.initializeLyricsColorManager();
    }
    
    setupElements() {
        this.lyricsContainer = DOMHelper.getElement('#lyrics-container');
        this.addLyricsItem(); // Add initial lyrics item
        
        this.setupFileUploads();
        this.setupFormInputs();
        this.setupExportButton();
        this.setupDebugButton();
        this.setupLyricsModal();
    }
    
    initializeLyricsColorManager() {
        if (window.lyricsColorManager) {
            this.lyricsColorManager = window.lyricsColorManager;
        }
    }
    
    setupFileUploads() {
        const uploadArea = DOMHelper.getElement('#upload-area');
        const fileInput = DOMHelper.getElement('#album-art');
        const audioUploadArea = DOMHelper.getElement('#audio-upload-area');
        const audioFileInput = DOMHelper.getElement('#audio-file');
        
        if (uploadArea && fileInput) {
            this.setupAlbumArtUpload(uploadArea, fileInput);
        }
        
        if (audioUploadArea && audioFileInput) {
            this.setupAudioUpload(audioUploadArea, audioFileInput);
        }
    }
    
    setupAlbumArtUpload(uploadArea, fileInput) {
        DOMHelper.setupDragAndDrop(uploadArea, {
            onDragOver: () => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#667eea',
                    background: 'rgba(102, 126, 234, 0.1)'
                });
            },
            onDragLeave: () => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#cbd5e0',
                    background: '#f7fafc'
                });
            },
            onDrop: (e) => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#cbd5e0',
                    background: '#f7fafc'
                });
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleAlbumArtFile(files[0]);
                }
            }
        });
        
        DOMHelper.setupFileInput(fileInput, (file) => this.handleAlbumArtFile(file));
    }
    
    setupAudioUpload(uploadArea, fileInput) {
        DOMHelper.setupDragAndDrop(uploadArea, {
            onDragOver: () => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#667eea',
                    background: 'rgba(102, 126, 234, 0.1)'
                });
            },
            onDragLeave: () => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#cbd5e0',
                    background: '#f7fafc'
                });
            },
            onDrop: (e) => {
                DOMHelper.setStyles(uploadArea, {
                    borderColor: '#cbd5e0',
                    background: '#f7fafc'
                });
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleAudioFile(files[0]);
                }
            }
        });
        
        DOMHelper.setupFileInput(fileInput, (file) => this.handleAudioFile(file));
    }
    
    handleAlbumArtFile(file) {
        const validation = ValidationHelper.validateImageFile(file);
        
        if (!validation.isValid) {
            this.showError('Invalid Album Art', validation.error);
            return;
        }
        
        this.updateUploadDisplay(file, 'album-art');
        this.sendAlbumArtToPlayer(file);
        this.showSuccess('Album Art Uploaded', `Successfully uploaded ${file.name}`);
    }
    
    handleAudioFile(file) {
        const validation = ValidationHelper.validateAudioFile(file);
        
        if (!validation.isValid) {
            this.showError('Invalid Audio File', validation.error);
            return;
        }
        
        this.updateUploadDisplay(file, 'audio');
        this.startAutoPlay(file);
        this.showSuccess('Audio File Uploaded', `Successfully uploaded ${file.name}`);
    }
    
    updateUploadDisplay(file, type) {
        const uploadArea = DOMHelper.getElement(type === 'album-art' ? '#upload-area' : '#audio-upload-area');
        const uploadText = DOMHelper.getElement('.upload-text', uploadArea);
        const uploadHint = DOMHelper.getElement('.upload-hint', uploadArea);
        
        if (uploadText && uploadHint) {
            DOMHelper.setTextContent(uploadText, file.name);
            DOMHelper.setTextContent(uploadHint, this.fileUtils.formatFileSize(file.size));
            DOMHelper.setStyles(uploadArea, {
                borderColor: '#38a169',
                background: 'rgba(56, 161, 105, 0.05)'
            });
        }
    }
    
    sendAlbumArtToPlayer(file) {
        if (file) {
            const imageUrl = this.fileUtils.createObjectURL(file);
            this.eventBus.emit('vinyl:updateAlbumArt', { imageUrl });
        }
    }
    
    startAutoPlay(file) {
        const audioUrl = this.fileUtils.createObjectURL(file);
        const songTitle = DOMHelper.getElement('#song-title')?.value || '';
        const artistName = DOMHelper.getElement('#artist-name')?.value || '';
        
        const albumArtFile = DOMHelper.getElement('#album-art')?.files[0];
        let albumArtUrl = null;
        if (albumArtFile) {
            albumArtUrl = this.fileUtils.createObjectURL(albumArtFile);
        }
        
        const messageData = {
            type: 'START_PLAY',
            audioUrl: audioUrl,
            songTitle: songTitle,
            artistName: artistName
        };
        
        if (albumArtUrl) {
            messageData.albumArtUrl = albumArtUrl;
        }
        
        this.eventBus.emit('audio:requestPlay', messageData);
    }
    
    setupFormInputs() {
        const inputs = DOMHelper.getElements('input, textarea');
        
        inputs.forEach(input => {
            DOMHelper.setupFormInput(input, () => this.sendRealTimeUpdate(input));
        });
    }
    
    sendRealTimeUpdate(input) {
        const inputId = input.id;
        
        if (this.updateTimeouts.has(inputId)) {
            clearTimeout(this.updateTimeouts.get(inputId));
        }
        
         const timeoutId = setTimeout(() => {
             let updateData = {};
             
             if (inputId === 'song-title') {
                 updateData.type = 'UPDATE_SONG_TITLE';
                 updateData.songTitle = input.value;
             } else if (inputId === 'artist-name') {
                 updateData.type = 'UPDATE_ARTIST_NAME';
                 updateData.artistName = input.value;
             }
             
             if (updateData.type) {
                 this.eventBus.emit('ui:updateSongInfo', updateData);
             }
             
             this.updateTimeouts.delete(inputId);
         }, 200);
        
        this.updateTimeouts.set(inputId, timeoutId);
    }
    
    setupExportButton() {
        const exportBtn = DOMHelper.getElement('#export-btn');
        const audioFileInput = DOMHelper.getElement('#audio-file');
        const songTitleInput = DOMHelper.getElement('#song-title');
        
        DOMHelper.addEventListener(exportBtn, 'click', () => this.handleExport());
        
        const updateExportButtonState = () => {
            const audioFile = audioFileInput?.files[0];
            const songTitle = songTitleInput?.value?.trim();
            
            DOMHelper.setDisabled(exportBtn, !(audioFile && songTitle));
        };
        
        DOMHelper.addEventListener(audioFileInput, 'change', updateExportButtonState);
        DOMHelper.addEventListener(songTitleInput, 'input', updateExportButtonState);
    }
    
    handleExport() {
        const audioFile = DOMHelper.getElement('#audio-file')?.files[0];
        const songTitle = DOMHelper.getElement('#song-title')?.value?.trim();
        const artistName = DOMHelper.getElement('#artist-name')?.value?.trim();
        const albumArtFile = DOMHelper.getElement('#album-art')?.files[0];
        
        if (!audioFile || !songTitle) {
            this.showError('Export Error', 'Please upload an audio file and enter a song title before exporting.');
            return;
        }
        
        const exportData = {
            audioFile: audioFile,
            songTitle: songTitle,
            artistName: artistName,
            albumArtFile: albumArtFile
        };
        
        // Show export start notification
        if (window.toastManager) {
            window.toastManager.showToast('warning', 'Export Started', 'Video export is in progress. Please keep this tab active for best recording quality!', 8000);
        }
        
        this.eventBus.emit('export:requestStart', exportData);
    }
    
    setupDebugButton() {
        const debugBtn = DOMHelper.getElement('#debug-btn');
        DOMHelper.addEventListener(debugBtn, 'click', () => this.handleDebugBrowserSupport());
    }
    
    handleDebugBrowserSupport() {
        const support = ValidationHelper.validateBrowserSupport();
        
        let message = 'Browser Support Check:\n\n';
        message += `MediaRecorder: ${support.mediaRecorder ? '✅' : '❌'}\n`;
        message += `Canvas: ${support.canvas ? '✅' : '❌'}\n`;
        message += `Audio: ${support.audio ? '✅' : '❌'}\n`;
        message += `WebM: ${support.webm ? '✅' : '❌'}\n`;
        message += `WebM VP8: ${support.webm_vp8 ? '✅' : '❌'}\n`;
        message += `WebM VP9: ${support.webm_vp9 ? '✅' : '❌'}\n`;
        message += `Browser: ${navigator.userAgent.split(' ')[0]}`;
        
        alert(message);
    }
    
    setupLyricsModal() {
        const devLyricsBtn = DOMHelper.getElement('#dev-lyrics-btn');
        const devLyricsModal = DOMHelper.getElement('#dev-lyrics-modal');
        const modalCloseBtn = DOMHelper.getElement('#modal-close-btn');
        const modalCancelBtn = DOMHelper.getElement('#modal-cancel-btn');
        const modalImportBtn = DOMHelper.getElement('#modal-import-btn');
        const jsonLyricsInput = DOMHelper.getElement('#json-lyrics-input');
        
        DOMHelper.setupModal(devLyricsModal, {
            openBtn: devLyricsBtn,
            closeBtn: modalCloseBtn,
            cancelBtn: modalCancelBtn,
            onOpen: () => this.openLyricsModal(devLyricsModal, jsonLyricsInput),
            onClose: () => this.closeLyricsModal(devLyricsModal, jsonLyricsInput),
            onCancel: () => this.closeLyricsModal(devLyricsModal, jsonLyricsInput)
        });
        
        DOMHelper.addEventListener(modalImportBtn, 'click', () => {
            this.handleLyricsImport(jsonLyricsInput, devLyricsModal);
        });
    }
    
    openLyricsModal(modal, input) {
        this.previousActiveElement = document.activeElement;
        DOMHelper.openModal(modal);
        DOMHelper.focusWithDelay(input, this.constants?.UI.FOCUS_DELAY || 100);
    }
    
    closeLyricsModal(modal, input) {
        const focusedElement = document.activeElement;
        if (focusedElement && modal.contains(focusedElement)) {
            DOMHelper.blur(focusedElement);
        }
        
        DOMHelper.closeModal(modal);
        input.value = '';
        
        if (this.previousActiveElement) {
            DOMHelper.focusWithDelay(this.previousActiveElement, 0);
        }
    }

    handleLyricsImport(input, modal) {
        const jsonText = input.value.trim();
        
        if (!jsonText) {
            this.showWarning('Warning', 'Please paste your JSON lyrics first.');
            return;
        }
        
        try {
            const lyricsData = JSON.parse(jsonText);
            const validation = ValidationHelper.validateLyricsData(lyricsData);
            
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            
            this.loadLyricsFromJSON(lyricsData);
            this.closeLyricsModal(modal, input);
            this.showSuccess('Import Successful', `Successfully imported ${lyricsData.length} lyrics items!`);
        } catch (error) {
            this.showError('Import Error', 'Error parsing JSON: ' + error.message);
        }
    }
    
    loadLyricsFromJSON(lyricsData) {
        DOMHelper.clear(this.lyricsContainer);
        
        lyricsData.forEach((item) => {
            this.addLyricsItem(item);
        });
        
        this.updateLyricsData();
    }
    
    addLyricsItem(item = null) {
        const startTime = item ? item.start : '00:00';
        const endTime = item ? item.end : '00:05';
        const text = item ? item.text : '';
        
        const lyricsCount = this.lyricsContainer.children.length + 1;
        
        const lyricsItem = DOMHelper.createElement('div', {
            className: 'lyrics-item',
            innerHTML: `
                <div class="lyrics-item-header">
                    <div class="lyrics-item-title">Lyrics ${lyricsCount}</div>
                    <button type="button" class="remove-lyrics-btn" onclick="removeLyricsItem(this)"><i class="fas fa-times"></i></button>
                </div>
                <div class="lyrics-inputs">
                    <div>
                        <div class="time-label">Start Time (mm:ss)</div>
                        <input type="text" class="time-input" placeholder="00:00" pattern="[0-9]{1,2}:[0-9]{2}" value="${startTime}" oninput="updateLyricsData()">
                    </div>
                    <div>
                        <div class="time-label">End Time (mm:ss)</div>
                        <input type="text" class="time-input" placeholder="00:05" pattern="[0-9]{1,2}:[0-9]{2}" value="${endTime}" oninput="updateLyricsData()">
                    </div>
                    <div>
                        <div class="lyrics-label">Lyrics Content</div>
                        <input type="text" class="lyrics-text-input" placeholder="Enter lyrics..." value="${text}" oninput="updateLyricsData()">
                    </div>
                </div>
            `
        });
        
        DOMHelper.appendChild(this.lyricsContainer, lyricsItem);
    }
    
    removeLyricsItem(button) {
        const lyricsItem = button.closest('.lyrics-item');
        DOMHelper.removeChild(this.lyricsContainer, lyricsItem);
        this.updateLyricsData();
        this.showInfo('Lyrics Removed', 'Lyrics item has been removed successfully');
    }
    
    updateLyricsData() {
        const lyricsItems = DOMHelper.getElements('.lyrics-item', this.lyricsContainer);
        const lyricsData = [];
        
        lyricsItems.forEach((item) => {
            const timeInputs = DOMHelper.getElements('.time-input', item);
            const startTimeString = timeInputs[0]?.value || '00:00';
            const endTimeString = timeInputs[1]?.value || '';
            const text = DOMHelper.getElement('.lyrics-text-input', item)?.value.trim() || '';
            
            if (text) {
                const startTime = this.timeUtils.timeToSeconds(startTimeString);
                let endTime;
                
                if (endTimeString === '') {
                    endTime = startTime + 5;
                } else {
                    endTime = this.timeUtils.timeToSeconds(endTimeString);
                }
                
                lyricsData.push({
                    start: startTime,
                    end: endTime,
                    text: text
                });
            }
        });
        
        this.eventBus.emit('lyrics:requestLoad', { lyrics: lyricsData });
    }
    
    setupEventListeners() {
        this.eventBus.on('export:progress', (data) => {
            this.updateExportProgress(data);
        });
        
        this.eventBus.on('export:complete', (data) => {
            this.handleExportComplete(data);
        });
        
        this.eventBus.on('export:error', (data) => {
            this.handleExportError(data);
        });
    }
    
    updateExportProgress(data) {
        const exportProgress = DOMHelper.getElement('#export-progress');
        const progressFill = DOMHelper.getElement('#progress-fill');
        const progressText = DOMHelper.getElement('#progress-text');
        
        if (exportProgress && progressFill && progressText) {
            DOMHelper.show(exportProgress);
            DOMHelper.setStyles(progressFill, { width: data.progress + '%' });
            DOMHelper.setTextContent(progressText, data.message);
        }
    }
    
    
    handleExportComplete(data) {
        const { videoBlob, fileName, wasMainAudioPlaying } = data;
        
        this.fileUtils.downloadBlob(videoBlob, fileName);
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = DOMHelper.getElement('#export-progress');
        const progressFill = DOMHelper.getElement('#progress-fill');
        const progressText = DOMHelper.getElement('#progress-text');
        
        DOMHelper.hide(exportProgress);
        DOMHelper.setStyles(progressFill, { width: '0%' });
        DOMHelper.setTextContent(progressText, 'Preparing export...');
        
        this.showSuccess('Export Complete', 'WebM video exported successfully!');
    }
    
    handleExportError(data) {
        const { wasMainAudioPlaying } = data;
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = DOMHelper.getElement('#export-progress');
        const progressFill = DOMHelper.getElement('#progress-fill');
        const progressText = DOMHelper.getElement('#progress-text');
        
        DOMHelper.hide(exportProgress);
        DOMHelper.setStyles(progressFill, { width: '0%' });
        DOMHelper.setTextContent(progressText, 'Preparing export...');
        
        this.showError('Export Failed', 'Export failed: ' + data.error);
    }
    
    // Toast methods are inherited from BaseModule
    
    
    pauseMainAudio() {
        const audioElement = this.appState.get('audio.element');
        const isPlaying = this.appState.get('audio.isPlaying');
        
        if (audioElement && isPlaying) {
            audioElement.pause();
            this.appState.set('audio.isPlaying', false);
            this.appState.set('vinyl.isAnimating', false);
            
            this.eventBus.emit('audio:requestUpdateUI');
            
            return true;
        }
        return false;
    }
    
    resumeMainAudio(wasMainAudioPlaying) {
        if (wasMainAudioPlaying) {
            const audioElement = this.appState.get('audio.element');
            if (audioElement) {
                audioElement.play().then(() => {
                    this.appState.set('audio.isPlaying', true);
                    this.appState.set('vinyl.isAnimating', true);
                    
                    this.eventBus.emit('audio:requestUpdateUI');
                }).catch(error => {
                    window.safeLog.warn('Failed to resume audio:', error);
                });
            }
        }
    }
    
    customDestroy() {
        // Custom cleanup if needed
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}

window.SettingsManager = SettingsManager;

function addLyricsItem() {
    if (window.settingsManager) {
        window.settingsManager.addLyricsItem();
    }
}

function removeLyricsItem(button) {
    if (window.settingsManager) {
        window.settingsManager.removeLyricsItem(button);
    }
}

function updateLyricsData() {
    if (window.settingsManager) {
        window.settingsManager.updateLyricsData();
    }
}

