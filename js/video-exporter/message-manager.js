/**
 * Export Message Manager
 * Handles communication with control panel for video export
 */
export class ExportMessageManager {
    constructor() {
        this.setupMessageListener();
    }

    /**
     * Setup message listener for all video exporter messages
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            const { type } = message;
            
            switch (type) {
                case 'UPDATE_LYRICS_COLOR':
                    if (this.onLyricsColorUpdate) {
                        this.onLyricsColorUpdate(message.color);
                    }
                    break;
                case 'EXPORT_WEBM':
                    if (this.onExportRequest) {
                        this.onExportRequest(message);
                    }
                    break;
                case 'DEBUG_BROWSER_SUPPORT':
                    if (this.onDebugBrowserSupport) {
                        this.onDebugBrowserSupport();
                    }
                    break;
            }
        });
    }

    /**
     * Set callbacks for message handling
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.onLyricsColorUpdate = callbacks.onLyricsColorUpdate;
        this.onExportRequest = callbacks.onExportRequest;
        this.onDebugBrowserSupport = callbacks.onDebugBrowserSupport;
    }

    /**
     * Handle export request from control panel
     * @param {Object} data - Export data
     * @param {Function} onExportRequest - Callback function
     */
    handleExportRequest(data, onExportRequest) {
        const { audioFile, songTitle, artistName, albumArtFile } = data;
        
        if (!window.MediaRecorder) {
            window.postMessage({
                type: 'EXPORT_ERROR',
                error: 'MediaRecorder API is not supported in this browser. Please use Chrome, Firefox, or Edge.'
            }, '*');
            return;
        }
        
        if (songTitle) {
            document.querySelector('.song-title').textContent = songTitle;
        }
        if (artistName) {
            document.querySelector('.artist-name').textContent = artistName;
        }
        
        if (onExportRequest) {
            onExportRequest(audioFile, songTitle, artistName, albumArtFile);
        }
    }
}
