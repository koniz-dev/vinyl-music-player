/**
 * File Upload Management Module
 * Handles album art and audio file uploads with drag & drop support
 */
export class UploadManager {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('album-art');
        this.audioUploadArea = document.getElementById('audio-upload-area');
        this.audioFileInput = document.getElementById('audio-file');
    }

    /**
     * Setup event listeners for all upload functionality
     */
    setupEventListeners() {
        // Setup drag and drop for album art upload
        this.setupDragAndDrop(this.uploadArea, this.fileInput, (file) => this.updateUploadDisplay(file));
        
        // Setup drag and drop for audio file upload
        this.setupDragAndDrop(this.audioUploadArea, this.audioFileInput, (file) => this.updateAudioUploadDisplay(file));
        
        // Setup real-time input listeners
        this.setupRealTimeInputListeners();
    }
    
    /**
     * Setup drag and drop functionality for upload areas
     * @param {HTMLElement} area - The upload area element
     * @param {HTMLElement} input - The file input element
     * @param {Function} updateFunction - Function to call when file is uploaded
     */
    setupDragAndDrop(area, input, updateFunction) {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.style.borderColor = '#667eea';
            area.style.background = 'rgba(102, 126, 234, 0.1)';
        });

        area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            area.style.borderColor = '#cbd5e0';
            area.style.background = '#f7fafc';
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.borderColor = '#cbd5e0';
            area.style.background = '#f7fafc';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                updateFunction(files[0]);
            }
        });

        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                updateFunction(input.files[0]);
            }
        });
    }

    /**
     * Update album art upload display and send to player
     * @param {File} file - The uploaded album art file
     */
    updateUploadDisplay(file) {
        const uploadText = this.uploadArea.querySelector('.upload-text');
        const uploadHint = this.uploadArea.querySelector('.upload-hint');
        
        uploadText.textContent = file.name;
        uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        this.uploadArea.style.borderColor = '#38a169';
        this.uploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
        
        this.sendAlbumArtToPlayer(file);
        this.showToastNotification('success', 'Album Art Uploaded', `Successfully uploaded "${file.name}" as album art!`);
    }

    /**
     * Update audio file upload display and start auto-play
     * @param {File} file - The uploaded audio file
     */
    updateAudioUploadDisplay(file) {
        const uploadText = this.audioUploadArea.querySelector('.upload-text');
        const uploadHint = this.audioUploadArea.querySelector('.upload-hint');
        
        uploadText.textContent = file.name;
        uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        this.audioUploadArea.style.borderColor = '#38a169';
        this.audioUploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
        
        this.startAutoPlay(file);
        this.showToastNotification('success', 'Audio File Uploaded', `Successfully uploaded "${file.name}" as audio file!`);
    }

    /**
     * Start auto-play with uploaded audio file
     * @param {File} file - The uploaded audio file
     */
    startAutoPlay(file) {
        const audioUrl = URL.createObjectURL(file);
        const songTitle = document.getElementById('song-title').value;
        const artistName = document.getElementById('artist-name').value;
        
        const albumArtFile = document.getElementById('album-art').files[0];
        let albumArtUrl = null;
        if (albumArtFile) {
            albumArtUrl = URL.createObjectURL(albumArtFile);
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
        
        window.postMessage(messageData, '*');
    }
    
    /**
     * Setup real-time input listeners for song title and artist name
     */
    setupRealTimeInputListeners() {
        const inputs = document.querySelectorAll('input, textarea');

        inputs.forEach(input => {
            input.addEventListener('input', () => this.sendRealTimeUpdate(input));
            input.addEventListener('keyup', () => this.sendRealTimeUpdate(input));
            input.addEventListener('paste', () => {
                setTimeout(() => this.sendRealTimeUpdate(input), 10);
            });
        });
    }

    /**
     * Send real-time update to music player
     * @param {HTMLElement} input - The input element that changed
     */
    sendRealTimeUpdate(input) {
        let updateData = {};
        
        if (input.id === 'song-title') {
            updateData.type = 'UPDATE_SONG_TITLE';
            updateData.songTitle = input.value;
        } else if (input.id === 'artist-name') {
            updateData.type = 'UPDATE_ARTIST_NAME';
            updateData.artistName = input.value;
        }
        
        if (updateData.type) {
            window.postMessage(updateData, '*');
        }
    }

    /**
     * Send album art to music player
     * @param {File} file - The album art file
     */
    sendAlbumArtToPlayer(file) {
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            
            window.postMessage({
                type: 'UPDATE_ALBUM_ART',
                imageUrl: imageUrl
            }, '*');
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
