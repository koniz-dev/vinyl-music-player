/**
 * Settings Manager Module
 * Handles settings UI, file uploads, and user interactions
 */
class SettingsManager {
    constructor() {
        this.eventBus = window.eventBus;
        this.appState = window.appState;
        this.fileUtils = window.FileUtils;
        this.timeUtils = window.TimeUtils;
        
        this.lyricsContainer = null;
        this.lyricsColorManager = null;
        this.updateTimeouts = new Map(); // Per-input debouncing
        
        this.setupEventListeners();
        this.initializeElements();
        this.initializeLyricsColorManager();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupElements();
            });
        } else {
            this.setupElements();
        }
    }
    
    /**
     * Setup DOM elements
     */
    setupElements() {
        this.lyricsContainer = document.getElementById('lyrics-container');
        this.addLyricsItem(); // Add initial lyrics item
        
        this.setupFileUploads();
        this.setupFormInputs();
        this.setupExportButton();
        this.setupDebugButton();
        this.setupLyricsModal();
    }
    
    /**
     * Initialize lyrics color manager
     */
    initializeLyricsColorManager() {
        if (window.lyricsColorManager) {
            this.lyricsColorManager = window.lyricsColorManager;
        }
    }
    
    /**
     * Setup file upload functionality
     */
    setupFileUploads() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('album-art');
        const audioUploadArea = document.getElementById('audio-upload-area');
        const audioFileInput = document.getElementById('audio-file');
        
        if (uploadArea && fileInput) {
            this.setupAlbumArtUpload(uploadArea, fileInput);
        }
        
        if (audioUploadArea && audioFileInput) {
            this.setupAudioUpload(audioUploadArea, audioFileInput);
        }
    }
    
    /**
     * Setup album art upload
     * @param {HTMLElement} uploadArea - Upload area element
     * @param {HTMLElement} fileInput - File input element
     */
    setupAlbumArtUpload(uploadArea, fileInput) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleAlbumArtFile(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleAlbumArtFile(e.target.files[0]);
            }
        });
    }
    
    /**
     * Setup audio upload
     * @param {HTMLElement} uploadArea - Upload area element
     * @param {HTMLElement} fileInput - File input element
     */
    setupAudioUpload(uploadArea, fileInput) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e0';
            uploadArea.style.background = '#f7fafc';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleAudioFile(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleAudioFile(e.target.files[0]);
            }
        });
    }
    
    /**
     * Handle album art file
     * @param {File} file - Album art file
     */
    handleAlbumArtFile(file) {
        const validation = this.fileUtils.validateImageFile(file);
        
        if (!validation.isValid) {
            this.showError('Invalid Album Art', validation.error);
            return;
        }
        
        this.updateUploadDisplay(file, 'album-art');
        this.sendAlbumArtToPlayer(file);
        this.showSuccess('Album Art Uploaded', `Successfully uploaded ${file.name}`);
    }
    
    /**
     * Handle audio file
     * @param {File} file - Audio file
     */
    handleAudioFile(file) {
        const validation = this.fileUtils.validateAudioFile(file);
        
        if (!validation.isValid) {
            this.showError('Invalid Audio File', validation.error);
            return;
        }
        
        this.updateUploadDisplay(file, 'audio');
        this.startAutoPlay(file);
        this.showSuccess('Audio File Uploaded', `Successfully uploaded ${file.name}`);
    }
    
    /**
     * Update upload display
     * @param {File} file - Uploaded file
     * @param {string} type - Upload type ('album-art' or 'audio')
     */
    updateUploadDisplay(file, type) {
        const uploadArea = document.getElementById(type === 'album-art' ? 'upload-area' : 'audio-upload-area');
        const uploadText = uploadArea.querySelector('.upload-text');
        const uploadHint = uploadArea.querySelector('.upload-hint');
        
        if (uploadText && uploadHint) {
            uploadText.textContent = file.name;
            uploadHint.textContent = this.fileUtils.formatFileSize(file.size);
            uploadArea.style.borderColor = '#38a169';
            uploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
        }
    }
    
    /**
     * Send album art to player
     * @param {File} file - Album art file
     */
    sendAlbumArtToPlayer(file) {
        if (file) {
            const imageUrl = this.fileUtils.createObjectURL(file);
            this.eventBus.emit('vinyl:updateAlbumArt', { imageUrl });
        }
    }
    
    /**
     * Start auto play with uploaded audio
     * @param {File} file - Audio file
     */
    startAutoPlay(file) {
        const audioUrl = this.fileUtils.createObjectURL(file);
        const songTitle = document.getElementById('song-title')?.value || '';
        const artistName = document.getElementById('artist-name')?.value || '';
        
        const albumArtFile = document.getElementById('album-art')?.files[0];
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
    
    /**
     * Setup form inputs
     */
    setupFormInputs() {
        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            const handleInputChange = () => {
                this.sendRealTimeUpdate(input);
            };
            
            input.addEventListener('input', handleInputChange);
            input.addEventListener('change', handleInputChange);
            input.addEventListener('keyup', handleInputChange);
            input.addEventListener('paste', () => {
                setTimeout(handleInputChange, 10);
            });
        });
    }
    
    /**
     * Send real-time update for form inputs
     * @param {HTMLElement} input - Input element
     */
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
                // console.log(`[SettingsManager] Song title updated: "${input.value}"`);
            } else if (inputId === 'artist-name') {
                updateData.type = 'UPDATE_ARTIST_NAME';
                updateData.artistName = input.value;
                // console.log(`[SettingsManager] Artist name updated: "${input.value}"`);
            }
            
            if (updateData.type) {
                this.eventBus.emit('ui:updateSongInfo', updateData);
            }
            
            this.updateTimeouts.delete(inputId);
        }, 500);
        
        this.updateTimeouts.set(inputId, timeoutId);
    }
    
    /**
     * Setup export button
     */
    setupExportButton() {
        const exportBtn = document.getElementById('export-btn');
        const audioFileInput = document.getElementById('audio-file');
        const songTitleInput = document.getElementById('song-title');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.handleExport();
            });
        }
        
        const updateExportButtonState = () => {
            const audioFile = audioFileInput?.files[0];
            const songTitle = songTitleInput?.value?.trim();
            
            if (exportBtn) {
                exportBtn.disabled = !(audioFile && songTitle);
            }
        };
        
        if (audioFileInput) {
            audioFileInput.addEventListener('change', updateExportButtonState);
        }
        
        if (songTitleInput) {
            songTitleInput.addEventListener('input', updateExportButtonState);
        }
    }
    
    /**
     * Handle export request
     */
    handleExport() {
        const audioFile = document.getElementById('audio-file')?.files[0];
        const songTitle = document.getElementById('song-title')?.value?.trim();
        const artistName = document.getElementById('artist-name')?.value?.trim();
        const albumArtFile = document.getElementById('album-art')?.files[0];
        
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
        
        this.eventBus.emit('export:requestStart', exportData);
    }
    
    /**
     * Setup debug button
     */
    setupDebugButton() {
        const debugBtn = document.getElementById('debug-btn');
        
        if (debugBtn) {
            debugBtn.addEventListener('click', () => {
                this.handleDebugBrowserSupport();
            });
        }
    }
    
    /**
     * Handle debug browser support
     */
    handleDebugBrowserSupport() {
        const support = {
            mediaRecorder: !!window.MediaRecorder,
            canvas: !!document.createElement('canvas').getContext,
            audio: !!window.Audio,
            webm: MediaRecorder.isTypeSupported('video/webm'),
            webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
            webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
            userAgent: navigator.userAgent
        };
        
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
    
    /**
     * Setup lyrics modal
     */
    setupLyricsModal() {
        const devLyricsBtn = document.getElementById('dev-lyrics-btn');
        const devLyricsModal = document.getElementById('dev-lyrics-modal');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const modalCancelBtn = document.getElementById('modal-cancel-btn');
        const modalImportBtn = document.getElementById('modal-import-btn');
        const jsonLyricsInput = document.getElementById('json-lyrics-input');
        
        if (devLyricsBtn && devLyricsModal) {
            devLyricsBtn.addEventListener('click', () => {
                this.openLyricsModal(devLyricsModal, jsonLyricsInput);
            });
        }
        
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeLyricsModal(devLyricsModal, jsonLyricsInput);
            });
        }
        
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => {
                this.closeLyricsModal(devLyricsModal, jsonLyricsInput);
            });
        }
        
        if (modalImportBtn) {
            modalImportBtn.addEventListener('click', () => {
                this.handleLyricsImport(jsonLyricsInput, devLyricsModal);
            });
        }
        
        if (devLyricsModal) {
            devLyricsModal.addEventListener('click', (e) => {
                if (e.target === devLyricsModal) {
                    this.closeLyricsModal(devLyricsModal, jsonLyricsInput);
                }
            });
            
            devLyricsModal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, devLyricsModal);
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && devLyricsModal?.style.display === 'flex') {
                this.closeLyricsModal(devLyricsModal, jsonLyricsInput);
            }
        });
    }
    
    /**
     * Open lyrics modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} input - Input element
     */
    openLyricsModal(modal, input) {
        this.previousActiveElement = document.activeElement;
        
        modal.setAttribute('aria-hidden', 'false');
        modal.removeAttribute('inert');
        modal.style.display = 'flex';
        
        setTimeout(() => {
            input.focus();
        }, 100);
    }
    
    /**
     * Close lyrics modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} input - Input element
     */
    closeLyricsModal(modal, input) {
        const focusedElement = document.activeElement;
        if (focusedElement && modal.contains(focusedElement)) {
            focusedElement.blur();
        }
        
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
        modal.style.display = 'none';
        input.value = '';
        
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
    }
    
    /**
     * Trap focus within modal for accessibility
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} modal - Modal element
     */
    trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }

    /**
     * Handle lyrics import
     * @param {HTMLElement} input - Input element
     * @param {HTMLElement} modal - Modal element
     */
    handleLyricsImport(input, modal) {
        const jsonText = input.value.trim();
        
        if (!jsonText) {
            this.showWarning('Warning', 'Please paste your JSON lyrics first.');
            return;
        }
        
        try {
            const lyricsData = JSON.parse(jsonText);
            const validation = this.timeUtils.validateLyricsData(lyricsData);
            
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
    
    /**
     * Load lyrics from JSON data
     * @param {Array} lyricsData - Lyrics data array
     */
    loadLyricsFromJSON(lyricsData) {
        this.lyricsContainer.innerHTML = '';
        
        lyricsData.forEach((item) => {
            this.addLyricsItem(item);
        });
        
        this.updateLyricsData();
    }
    
    /**
     * Add lyrics item
     * @param {Object} item - Lyrics item data (optional)
     */
    addLyricsItem(item = null) {
        const lyricsItem = document.createElement('div');
        lyricsItem.className = 'lyrics-item';
        
        const startTime = item ? item.start : '00:00';
        const endTime = item ? item.end : '00:05';
        const text = item ? item.text : '';
        
        const lyricsCount = this.lyricsContainer.children.length + 1;
        
        lyricsItem.innerHTML = `
            <div class="lyrics-item-header">
                <div class="lyrics-item-title">Lyrics ${lyricsCount}</div>
                <button type="button" class="remove-lyrics-btn" onclick="removeLyricsItem(this)">×</button>
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
        `;
        
        this.lyricsContainer.appendChild(lyricsItem);
    }
    
    /**
     * Remove lyrics item
     * @param {HTMLElement} button - Remove button element
     */
    removeLyricsItem(button) {
        const lyricsItem = button.closest('.lyrics-item');
        lyricsItem.remove();
        this.updateLyricsData();
        this.showInfo('Lyrics Removed', 'Lyrics item has been removed successfully');
    }
    
    /**
     * Update lyrics data
     */
    updateLyricsData() {
        const lyricsItems = this.lyricsContainer.querySelectorAll('.lyrics-item');
        const lyricsData = [];
        
        lyricsItems.forEach((item) => {
            const timeInputs = item.querySelectorAll('.time-input');
            const startTimeString = timeInputs[0]?.value || '00:00';
            const endTimeString = timeInputs[1]?.value || '';
            const text = item.querySelector('.lyrics-text-input')?.value.trim() || '';
            
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
    
    /**
     * Setup event listeners
     */
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
    
    /**
     * Update export progress
     * @param {Object} data - Progress data
     */
    updateExportProgress(data) {
        const exportProgress = document.getElementById('export-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress && progressFill && progressText) {
            exportProgress.style.display = 'block';
            progressFill.style.width = data.progress + '%';
            progressText.textContent = data.message;
        }
    }
    
    
    /**
     * Handle export complete
     * @param {Object} data - Export complete data
     */
    handleExportComplete(data) {
        const { videoBlob, fileName, wasMainAudioPlaying } = data;
        
        this.fileUtils.downloadBlob(videoBlob, fileName);
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = document.getElementById('export-progress');
        const exportBtn = document.getElementById('export-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress) {
            exportProgress.style.display = 'none';
        }
        
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressText) {
            progressText.textContent = 'Preparing export...';
        }
        
        this.showSuccess('Export Complete', 'WebM video exported successfully!');
    }
    
    /**
     * Handle export error
     * @param {Object} data - Error data
     */
    handleExportError(data) {
        const { wasMainAudioPlaying } = data;
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = document.getElementById('export-progress');
        const exportBtn = document.getElementById('export-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress) {
            exportProgress.style.display = 'none';
        }
        
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressText) {
            progressText.textContent = 'Preparing export...';
        }
        
        this.showError('Export Failed', 'Export failed: ' + data.error);
    }
    
    /**
     * Show success message
     * @param {string} title - Message title
     * @param {string} message - Message content
     */
    showSuccess(title, message) {
        if (window.toastManager) {
            window.toastManager.showSuccess(title, message);
        }
    }
    
    /**
     * Show error message
     * @param {string} title - Message title
     * @param {string} message - Message content
     */
    showError(title, message) {
        if (window.toastManager) {
            window.toastManager.showError(title, message);
        }
    }
    
    /**
     * Show warning message
     * @param {string} title - Message title
     * @param {string} message - Message content
     */
    showWarning(title, message) {
        if (window.toastManager) {
            window.toastManager.showWarning(title, message);
        }
    }
    
    /**
     * Show info message
     * @param {string} title - Message title
     * @param {string} message - Message content
     */
    showInfo(title, message) {
        if (window.toastManager) {
            window.toastManager.showInfo(title, message);
        }
    }
    
    
    /**
     * Pause main audio and return whether it was playing
     * @returns {boolean} Whether main audio was playing
     */
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
    
    /**
     * Resume main audio if it was playing
     * @param {boolean} wasMainAudioPlaying - Whether main audio was playing
     */
    resumeMainAudio(wasMainAudioPlaying) {
        if (wasMainAudioPlaying) {
            const audioElement = this.appState.get('audio.element');
            if (audioElement) {
                audioElement.play().then(() => {
                    this.appState.set('audio.isPlaying', true);
                    this.appState.set('vinyl.isAnimating', true);
                    
                    this.eventBus.emit('audio:requestUpdateUI');
                }).catch(error => {
                    console.warn('Failed to resume audio:', error);
                });
            }
        }
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.eventBus.emit('settings:destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
}

window.SettingsManager = SettingsManager;

// Global functions for HTML compatibility
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

