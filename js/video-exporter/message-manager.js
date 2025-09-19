/**
 * Message Manager
 * Handles communication with control panel
 */
export class MessageManager {
    constructor() {
        this.setupMessageListener();
    }

    /**
     * Setup message listener for lyrics color updates
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'UPDATE_LYRICS_COLOR') {
                if (this.onLyricsColorUpdate) {
                    this.onLyricsColorUpdate(event.data.color);
                }
            }
        });
    }

    /**
     * Set callback for lyrics color updates
     * @param {Function} callback - Callback function
     */
    setLyricsColorCallback(callback) {
        this.onLyricsColorUpdate = callback;
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
            document.querySelector('.vinyl-song-title').textContent = songTitle;
        }
        if (artistName) {
            document.querySelector('.vinyl-artist-name').textContent = artistName;
        }
        
        if (onExportRequest) {
            onExportRequest(audioFile, songTitle, artistName, albumArtFile);
        }
    }
}
