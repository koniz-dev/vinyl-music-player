/**
 * Export Management Module
 * Handles video export functionality and button states
 */
export class ExportManager {
    constructor() {
        this.isExportCompleted = false;
        this.initializeElements();
        this.setupEventListeners();
        this.setupExportMessageListener();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.exportBtn = document.getElementById('export-btn');
        this.debugBtn = document.getElementById('debug-btn');
        this.exportProgress = document.getElementById('export-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Setup export button state listeners
        document.getElementById('audio-file').addEventListener('change', () => this.updateExportButtonState());
        document.getElementById('song-title').addEventListener('input', () => this.updateExportButtonState());

        // Debug button event listener
        this.debugBtn.addEventListener('click', () => {
            window.postMessage({
                type: 'DEBUG_BROWSER_SUPPORT'
            }, '*');
        });
        
        // Export button event listener
        this.exportBtn.addEventListener('click', () => this.handleExportClick());
    }
    
    /**
     * Update export button state based on required fields
     */
    updateExportButtonState() {
        const audioFile = document.getElementById('audio-file').files[0];
        const songTitle = document.getElementById('song-title').value.trim();
        
        this.exportBtn.disabled = !(audioFile && songTitle);
    }
    
    /**
     * Handle export button click
     */
    async handleExportClick() {
        const audioFile = document.getElementById('audio-file').files[0];
        const songTitle = document.getElementById('song-title').value.trim();
        const artistName = document.getElementById('artist-name').value.trim();
        const albumArtFile = document.getElementById('album-art').files[0];
        
        // Validate required fields
        if (!audioFile || !songTitle) {
            this.showToastNotification('warning', 'Missing Information', 'Please upload an audio file and enter a song title before exporting.');
            return;
        }

        // Show export progress UI
        this.exportProgress.classList.remove('hidden');
        this.exportProgress.style.display = 'block';
        this.exportBtn.disabled = true;
        
        this.showToastNotification('info', 'Export Started', 'Video export has started. Please wait...');
        
        // Scroll to progress bar
        setTimeout(() => {
            this.exportProgress.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
        
        try {
            const exportData = {
                type: 'EXPORT_WEBM',
                audioFile: audioFile,
                songTitle: songTitle,
                artistName: artistName,
                albumArtFile: albumArtFile
            };
            
            window.postMessage(exportData, '*');
        } catch (error) {
            this.showToastNotification('error', 'Export Failed', 'Export failed. Please try again.');
            this.exportProgress.style.display = 'none';
            this.exportBtn.disabled = false;
        }
    }

    /**
     * Handle export completion and download
     * @param {Blob} videoBlob - The exported video blob
     * @param {string} fileName - The filename for the download
     */
    handleExportComplete(videoBlob, fileName) {
        if (this.isExportCompleted) {
            return;
        }
        this.isExportCompleted = true;
        
        // Create download link and trigger download
        const url = URL.createObjectURL(videoBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        // Reset export UI
        this.exportProgress.classList.add('hidden');
        this.exportProgress.style.display = 'none';
        this.exportBtn.disabled = false;
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Preparing export...';
        
        this.showToastNotification('success', 'Export Complete', `WebM video "${fileName}" exported successfully!`);
        
        // Reset completion flag after delay
        setTimeout(() => {
            this.isExportCompleted = false;
        }, 2000);
    }

    /**
     * Setup export message listener
     * Handles export progress, completion, and error messages
     */
    setupExportMessageListener() {
        if (!window.exportMessageListenerAdded) {
            window.exportMessageListenerAdded = true;
            
            const settingsContainer = document.querySelector('.left-panel');
            if (settingsContainer) {
                settingsContainer.addEventListener('exportMessage', (event) => {
                    const data = event.detail;
                    
                    switch (data.type) {
                        case 'EXPORT_PROGRESS':
                            this.progressFill.style.width = data.progress + '%';
                            this.progressText.textContent = data.message;
                            break;
                            
                        case 'EXPORT_COMPLETE':
                            this.handleExportComplete(data.videoBlob, data.fileName);
                            break;
                            
                        case 'EXPORT_ERROR':
                            this.showToastNotification('error', 'Export Failed', 'Export failed: ' + data.error);
                            
                            // Reset export UI
                            this.exportProgress.classList.add('hidden');
                            this.exportProgress.style.display = 'none';
                            this.exportBtn.disabled = false;
                            this.progressFill.style.width = '0%';
                            this.progressText.textContent = 'Preparing export...';
                            break;
                    }
                });
            }
        }
    }
    
    /**
     * Show toast notification
     * @param {string} type - Type of notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    showToastNotification(type, title, message) {
        if (window.toastSystem) {
            window.toastSystem.showToast(type, title, message);
        } else {
            // Fallback to alert if toast system is not available
            alert(`${title}: ${message}`);
        }
    }
}
