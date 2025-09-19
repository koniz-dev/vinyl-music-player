/**
 * Lyrics Management Module
 * Handles adding, removing, and managing lyrics items
 */

// DOM Elements
const lyricsContainer = document.getElementById('lyrics-container');
const addLyricsBtn = document.getElementById('add-lyrics-btn');
let lyricsCount = 0;

// Initialize with one lyrics item (without notification)
addLyricsItem(false);

/**
 * Add a new lyrics item to the container
 * @param {boolean} showNotification - Whether to show success notification (default: true)
 */
function addLyricsItem(showNotification = true) {
    lyricsCount++;
    const lyricsItem = document.createElement('div');
    lyricsItem.className = 'lyrics-item';
    lyricsItem.innerHTML = `
        <div class="lyrics-item-header">
            <div class="lyrics-item-title">Lyrics ${lyricsCount}</div>
            <button type="button" class="remove-lyrics-btn" onclick="removeLyricsItem(this)">×</button>
        </div>
        <div class="lyrics-inputs">
            <div>
                <div class="time-label">Start Time (mm:ss)</div>
                <input type="text" class="time-input" placeholder="00:00" pattern="[0-9]{1,2}:[0-9]{2}" oninput="updateLyricsData()">
            </div>
            <div>
                <div class="time-label">End Time (mm:ss)</div>
                <input type="text" class="time-input" placeholder="00:05" pattern="[0-9]{1,2}:[0-9]{2}" oninput="updateLyricsData()">
            </div>
            <div>
                <div class="lyrics-label">Lyrics Content</div>
                <input type="text" class="lyrics-text-input" placeholder="Enter lyrics..." oninput="updateLyricsData()">
            </div>
        </div>
    `;
    lyricsContainer.appendChild(lyricsItem);
    
    // Show success notification only if requested
    if (showNotification) {
        showToastNotification('success', 'Lyrics Added', `Lyrics item ${lyricsCount} has been added successfully!`);
    }
}

/**
 * Remove a lyrics item from the container
 * @param {HTMLElement} button - The remove button element
 */
function removeLyricsItem(button) {
    const lyricsItem = button.closest('.lyrics-item');
    const lyricsTitle = lyricsItem.querySelector('.lyrics-item-title').textContent;
    lyricsItem.remove();
    updateLyricsData();
    
    // Show info notification
    showToastNotification('info', 'Lyrics Removed', `${lyricsTitle} has been removed successfully!`);
}

/**
 * Time Utility Functions
 */

/**
 * Convert time string (mm:ss) to seconds
 * @param {string} timeString - Time in format "mm:ss"
 * @returns {number} Time in seconds
 */
function timeToSeconds(timeString) {
    if (!timeString || timeString === '') return 0;
    
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes * 60 + seconds;
}

/**
 * Update lyrics data from all lyrics items and send to player
 */
function updateLyricsData() {
    const lyricsItems = lyricsContainer.querySelectorAll('.lyrics-item');
    const lyricsData = [];
    
    lyricsItems.forEach((item) => {
        const timeInputs = item.querySelectorAll('.time-input');
        const startTimeString = timeInputs[0]?.value || '00:00';
        const endTimeString = timeInputs[1]?.value || '';
        const text = item.querySelector('.lyrics-text-input')?.value.trim() || '';
        
        if (text) {
            const startTime = timeToSeconds(startTimeString);
            const endTime = endTimeString === '' ? startTime + 5 : timeToSeconds(endTimeString);
            
            lyricsData.push({
                start: startTime,
                end: endTime,
                text: text
            });
        }
    });
    
    sendLyricsToPlayer(lyricsData);
}

/**
 * Send lyrics data to the music player
 * @param {Array} lyricsData - Array of lyrics objects
 */
function sendLyricsToPlayer(lyricsData) {
    window.postMessage({
        type: 'UPDATE_LYRICS',
        lyrics: lyricsData
    }, '*');
}
/**
 * Toast Notification Helper
 * @param {string} type - Type of notification (success, error, info, warning)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
function showToastNotification(type, title, message) {
    if (window.toastSystem) {
        window.toastSystem.showToast(type, title, message);
    } else {
        // Fallback to alert if toast system is not available
        alert(`${title}: ${message}`);
    }
}

// Event Listeners
addLyricsBtn.addEventListener('click', addLyricsItem);

/**
 * Modal Management Module
 * Handles the developer lyrics import modal
 */

// Modal DOM Elements
const devLyricsBtn = document.getElementById('dev-lyrics-btn');
const devLyricsModal = document.getElementById('dev-lyrics-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalImportBtn = document.getElementById('modal-import-btn');
const jsonLyricsInput = document.getElementById('json-lyrics-input');

/**
 * Open the developer lyrics modal
 */
function openModal() {
    devLyricsModal.classList.remove('hidden');
    devLyricsModal.style.display = 'flex';
    jsonLyricsInput.focus();
}

/**
 * Close the developer lyrics modal
 */
function closeModal() {
    devLyricsModal.classList.add('hidden');
    devLyricsModal.style.display = 'none';
    jsonLyricsInput.value = '';
}

// Modal Event Listeners
devLyricsBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
devLyricsModal.addEventListener('click', function(e) {
    if (e.target === devLyricsModal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !devLyricsModal.classList.contains('hidden')) {
        closeModal();
    }
});
/**
 * Import lyrics from JSON data
 */
function importLyricsFromJSON() {
    const jsonText = jsonLyricsInput.value.trim();
    
    if (!jsonText) {
        showToastNotification('warning', 'Input Required', 'Please paste your JSON lyrics first.');
        return;
    }
    
    try {
        const lyricsData = JSON.parse(jsonText);
        
        // Validate JSON structure
        validateLyricsData(lyricsData);
        
        // Clear existing lyrics and import new ones
        clearLyricsContainer();
        importLyricsItems(lyricsData);
        
        updateLyricsData();
        closeModal();
        
        showToastNotification('success', 'Import Successful', `Successfully imported ${lyricsData.length} lyrics items!`);
        
    } catch (error) {
        showToastNotification('error', 'Import Failed', 'Error parsing JSON: ' + error.message);
    }
}

/**
 * Validate lyrics data structure
 * @param {Array} lyricsData - Array of lyrics objects to validate
 */
function validateLyricsData(lyricsData) {
    if (!Array.isArray(lyricsData)) {
        throw new Error('JSON must be an array of objects');
    }
    
    const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
    
    lyricsData.forEach((item, index) => {
        if (typeof item !== 'object' || item === null) {
            throw new Error(`Item at index ${index} must be an object`);
        }
        
        if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
            throw new Error(`Item at index ${index} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
        }
        
        if (!timeRegex.test(item.start) || !timeRegex.test(item.end)) {
            throw new Error(`Item at index ${index} has invalid time format. Use mm:ss format (e.g., "01:30")`);
        }
        
        const startSeconds = timeToSeconds(item.start);
        const endSeconds = timeToSeconds(item.end);
        
        if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
            throw new Error(`Item at index ${index} has invalid time values: start must be >= 00:00, end must be > start`);
        }
    });
}

/**
 * Clear the lyrics container and reset counter
 */
function clearLyricsContainer() {
    lyricsContainer.innerHTML = '';
    lyricsCount = 0;
}

/**
 * Import lyrics items from validated data
 * @param {Array} lyricsData - Validated array of lyrics objects
 */
function importLyricsItems(lyricsData) {
    lyricsData.forEach((item) => {
        lyricsCount++;
        const lyricsItem = document.createElement('div');
        lyricsItem.className = 'lyrics-item';
        lyricsItem.innerHTML = `
            <div class="lyrics-item-header">
                <div class="lyrics-item-title">Lyrics ${lyricsCount}</div>
                <button type="button" class="remove-lyrics-btn" onclick="removeLyricsItem(this)">×</button>
            </div>
            <div class="lyrics-inputs">
                <div>
                    <div class="time-label">Start Time (mm:ss)</div>
                    <input type="text" class="time-input" placeholder="00:00" pattern="[0-9]{1,2}:[0-9]{2}" value="${item.start}" oninput="updateLyricsData()">
                </div>
                <div>
                    <div class="time-label">End Time (mm:ss)</div>
                    <input type="text" class="time-input" placeholder="00:05" pattern="[0-9]{1,2}:[0-9]{2}" value="${item.end}" oninput="updateLyricsData()">
                </div>
                <div>
                    <div class="lyrics-label">Lyrics Content</div>
                    <input type="text" class="lyrics-text-input" placeholder="Enter lyrics..." value="${item.text}" oninput="updateLyricsData()">
                </div>
            </div>
        `;
        lyricsContainer.appendChild(lyricsItem);
    });
}

// Import button event listener
modalImportBtn.addEventListener('click', importLyricsFromJSON);
/**
 * File Upload Management Module
 * Handles album art and audio file uploads with drag & drop support
 */

// Upload DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('album-art');
const audioUploadArea = document.getElementById('audio-upload-area');
const audioFileInput = document.getElementById('audio-file');

/**
 * Setup drag and drop functionality for upload areas
 * @param {HTMLElement} area - The upload area element
 * @param {HTMLElement} input - The file input element
 * @param {Function} updateFunction - Function to call when file is uploaded
 */
function setupDragAndDrop(area, input, updateFunction) {
    area.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = 'rgba(102, 126, 234, 0.1)';
    });

    area.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e0';
        this.style.background = '#f7fafc';
    });

    area.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e0';
        this.style.background = '#f7fafc';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            updateFunction(files[0]);
        }
    });

    input.addEventListener('change', function() {
        if (this.files.length > 0) {
            updateFunction(this.files[0]);
        }
    });
}

// Setup drag and drop for album art upload
setupDragAndDrop(uploadArea, fileInput, updateUploadDisplay);

// Setup drag and drop for audio file upload
setupDragAndDrop(audioUploadArea, audioFileInput, updateAudioUploadDisplay);

/**
 * Update album art upload display and send to player
 * @param {File} file - The uploaded album art file
 */
function updateUploadDisplay(file) {
    const uploadText = uploadArea.querySelector('.upload-text');
    const uploadHint = uploadArea.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    uploadArea.style.borderColor = '#38a169';
    uploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
    
    sendAlbumArtToPlayer(file);
    showToastNotification('success', 'Album Art Uploaded', `Successfully uploaded "${file.name}" as album art!`);
}

/**
 * Update audio file upload display and start auto-play
 * @param {File} file - The uploaded audio file
 */
function updateAudioUploadDisplay(file) {
    const uploadText = audioUploadArea.querySelector('.upload-text');
    const uploadHint = audioUploadArea.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    audioUploadArea.style.borderColor = '#38a169';
    audioUploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
    
    startAutoPlay(file);
    showToastNotification('success', 'Audio File Uploaded', `Successfully uploaded "${file.name}" as audio file!`);
}

/**
 * Start auto-play with uploaded audio file
 * @param {File} file - The uploaded audio file
 */
function startAutoPlay(file) {
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
 * Real-time Input Management Module
 * Handles real-time updates for song title and artist name inputs
 */

// Setup real-time input listeners
const inputs = document.querySelectorAll('input, textarea');

inputs.forEach(input => {
    input.addEventListener('input', () => sendRealTimeUpdate(input));
    input.addEventListener('keyup', () => sendRealTimeUpdate(input));
    input.addEventListener('paste', () => {
        setTimeout(() => sendRealTimeUpdate(input), 10);
    });
});

/**
 * Send real-time update to music player
 * @param {HTMLElement} input - The input element that changed
 */
function sendRealTimeUpdate(input) {
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
 * Album Art Communication Functions
 */

/**
 * Send album art to music player
 * @param {File} file - The album art file
 */
function sendAlbumArtToPlayer(file) {
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        
        window.postMessage({
            type: 'UPDATE_ALBUM_ART',
            imageUrl: imageUrl
        }, '*');
    }
}


/**
 * Export Management Module
 * Handles video export functionality and button states
 */

// Export DOM Elements
const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportProgress = document.getElementById('export-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

/**
 * Update export button state based on required fields
 */
function updateExportButtonState() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    
    exportBtn.disabled = !(audioFile && songTitle);
}

// Setup export button state listeners
document.getElementById('audio-file').addEventListener('change', updateExportButtonState);
document.getElementById('song-title').addEventListener('input', updateExportButtonState);

// Debug button event listener
debugBtn.addEventListener('click', function() {
    window.postMessage({
        type: 'DEBUG_BROWSER_SUPPORT'
    }, '*');
});
/**
 * Handle export button click
 */
exportBtn.addEventListener('click', async function() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    const artistName = document.getElementById('artist-name').value.trim();
    const albumArtFile = document.getElementById('album-art').files[0];
    
    // Validate required fields
    if (!audioFile || !songTitle) {
        showToastNotification('warning', 'Missing Information', 'Please upload an audio file and enter a song title before exporting.');
        return;
    }

    // Show export progress UI
    exportProgress.classList.remove('hidden');
    exportProgress.style.display = 'block';
    exportBtn.disabled = true;
    
    showToastNotification('info', 'Export Started', 'Video export has started. Please wait...');
    
    // Scroll to progress bar
    setTimeout(() => {
        exportProgress.scrollIntoView({ 
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
        showToastNotification('error', 'Export Failed', 'Export failed. Please try again.');
        exportProgress.style.display = 'none';
        exportBtn.disabled = false;
    }
});

/**
 * Export Completion Handler
 */

let isExportCompleted = false;

/**
 * Handle export completion and download
 * @param {Blob} videoBlob - The exported video blob
 * @param {string} fileName - The filename for the download
 */
function handleExportComplete(videoBlob, fileName) {
    if (isExportCompleted) {
        return;
    }
    isExportCompleted = true;
    
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
    exportProgress.classList.add('hidden');
    exportProgress.style.display = 'none';
    exportBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing export...';
    
    showToastNotification('success', 'Export Complete', `WebM video "${fileName}" exported successfully!`);
    
    // Reset completion flag after delay
    setTimeout(() => {
        isExportCompleted = false;
    }, 2000);
}

/**
 * Export Message Listener Setup
 * Handles export progress, completion, and error messages
 */
if (!window.exportMessageListenerAdded) {
    window.exportMessageListenerAdded = true;
    
    const settingsContainer = document.querySelector('.left-panel');
    if (settingsContainer) {
        settingsContainer.addEventListener('exportMessage', function(event) {
            const data = event.detail;
            
            switch (data.type) {
                case 'EXPORT_PROGRESS':
                    progressFill.style.width = data.progress + '%';
                    progressText.textContent = data.message;
                    break;
                    
                case 'EXPORT_COMPLETE':
                    handleExportComplete(data.videoBlob, data.fileName);
                    break;
                    
                case 'EXPORT_ERROR':
                    showToastNotification('error', 'Export Failed', 'Export failed: ' + data.error);
                    
                    // Reset export UI
                    exportProgress.classList.add('hidden');
                    exportProgress.style.display = 'none';
                    exportBtn.disabled = false;
                    progressFill.style.width = '0%';
                    progressText.textContent = 'Preparing export...';
                    break;
            }
        });
    }
}

/**
 * Lyrics Color Management Class
 * Handles color picker, history, and persistence for lyrics colors
 */
class LyricsColorManager {
    constructor() {
        this.colorHistory = this.loadColorHistory();
        this.currentColor = this.loadCurrentColor();
        this.maxHistorySize = 5;
        
        // Clear any old default colors from localStorage
        this.cleanupOldDefaultColors();
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateColorPreview();
        this.renderColorHistory();
        // Send initial color to player without adding to history
        this.sendColorToPlayer();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.colorPicker = document.getElementById('lyrics-color-picker');
        this.colorPreview = document.getElementById('color-preview');
        this.colorHistoryContainer = document.getElementById('color-history');
        this.copyHexBtn = document.getElementById('copy-hex-btn');
    }
    
    /**
     * Setup event listeners for color picker and copy button
     */
    setupEventListeners() {
        this.colorPicker.addEventListener('input', (e) => {
            this.updateColorPreviewOnly(e.target.value);
        });
        this.colorPicker.addEventListener('change', (e) => {
            this.setCurrentColor(e.target.value);
        });
        
        this.copyHexBtn.addEventListener('click', () => {
            this.copyHexToClipboard();
        });
    }
    
    /**
     * Set current color and optionally add to history
     * @param {string} color - The color to set
     * @param {boolean} addToHistory - Whether to add to history
     */
    setCurrentColor(color, addToHistory = true) {
        this.currentColor = color;
        if (addToHistory) {
            this.addToHistory(color);
        }
        this.updateColorPreview();
        this.renderColorHistory();
        this.saveCurrentColor();
        this.sendColorToPlayer();
    }
    
    /**
     * Update color preview only (without saving to history)
     * @param {string} color - The color to preview
     */
    updateColorPreviewOnly(color) {
        this.currentColor = color;
        this.updateColorPreview();
        this.sendColorToPlayer();
    }
    
    /**
     * Add color to history (excluding default colors)
     * @param {string} color - The color to add
     */
    addToHistory(color) {
        // Don't add default color to history
        if (color === '#ffb3d1') {
            return;
        }
        
        // Remove if already exists
        this.colorHistory = this.colorHistory.filter(c => c !== color);
        
        // Add to beginning
        this.colorHistory.unshift(color);
        
        // Keep only max history size
        if (this.colorHistory.length > this.maxHistorySize) {
            this.colorHistory = this.colorHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveColorHistory();
    }
    
    /**
     * Update color preview display
     */
    updateColorPreview() {
        this.colorPreview.textContent = this.currentColor.toUpperCase();
        this.colorPreview.style.backgroundColor = this.currentColor;
        this.colorPreview.style.color = this.getContrastColor(this.currentColor);
        this.colorPicker.value = this.currentColor;
    }
    
    /**
     * Get contrasting text color for background
     * @param {string} hexColor - The background color in hex format
     * @returns {string} The contrasting text color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    /**
     * Render color history items
     */
    renderColorHistory() {
        this.colorHistoryContainer.innerHTML = '';
        
        // Only show color history section if there are colors
        const colorHistorySection = document.querySelector('.color-history-section');
        
        if (this.colorHistory.length === 0) {
            colorHistorySection.classList.add('hidden');
            return;
        } else {
            colorHistorySection.classList.remove('hidden');
        }
        
        // Render existing colors
        this.colorHistory.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-history-item';
            colorItem.style.backgroundColor = color;
            colorItem.title = color.toUpperCase();
            
            colorItem.addEventListener('click', () => {
                this.setCurrentColor(color, false); // Don't add to history when clicking existing color
            });
            
            this.colorHistoryContainer.appendChild(colorItem);
        });
    }
    
    /**
     * Send current color to music player
     */
    sendColorToPlayer() {
        window.postMessage({
            type: 'UPDATE_LYRICS_COLOR',
            color: this.currentColor
        }, '*');
    }
    
    /**
     * Local Storage Methods
     */
    
    /**
     * Load color history from localStorage
     * @returns {Array} Array of saved colors
     */
    loadColorHistory() {
        try {
            const saved = localStorage.getItem('lyricsColorHistory');
            const history = saved ? JSON.parse(saved) : [];
            // Filter out any default colors that might have been saved before
            return history.filter(color => color !== '#ffb3d1' && color !== '#ffffff');
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Save color history to localStorage
     */
    saveColorHistory() {
        try {
            localStorage.setItem('lyricsColorHistory', JSON.stringify(this.colorHistory));
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Load current color from localStorage
     * @returns {string} The saved current color or default
     */
    loadCurrentColor() {
        try {
            return localStorage.getItem('lyricsCurrentColor') || '#ffb3d1';
        } catch (e) {
            return '#ffb3d1';
        }
    }
    
    /**
     * Save current color to localStorage
     */
    saveCurrentColor() {
        try {
            localStorage.setItem('lyricsCurrentColor', this.currentColor);
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Get current color
     * @returns {string} The current color
     */
    getCurrentColor() {
        return this.currentColor;
    }
    
    /**
     * Clean up old default colors from localStorage
     */
    cleanupOldDefaultColors() {
        // Force clear any existing color history to start fresh
        this.colorHistory = [];
        this.saveColorHistory();
        
        // Also clear any old default colors from localStorage
        try {
            localStorage.removeItem('lyricsColorHistory');
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Copy current color hex value to clipboard
     */
    async copyHexToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentColor);
            this.showCopyFeedback();
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard();
        }
    }
    
    /**
     * Show visual feedback for successful copy
     */
    showCopyFeedback() {
        const originalIcon = this.copyHexBtn.querySelector('.copy-icon').textContent;
        this.copyHexBtn.classList.add('copied');
        this.copyHexBtn.querySelector('.copy-icon').textContent = '✓';
        
        showToastNotification('success', 'Color Copied', `Hex color ${this.currentColor} copied to clipboard!`);
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.copyHexBtn.classList.remove('copied');
            this.copyHexBtn.querySelector('.copy-icon').textContent = originalIcon;
        }, 2000);
    }
    
    /**
     * Fallback copy method for older browsers
     */
    fallbackCopyToClipboard() {
        const textArea = document.createElement('textarea');
        textArea.value = this.currentColor;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        this.showCopyFeedback();
    }
}

/**
 * Initialize Lyrics Color Manager when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Force clear localStorage first
    try {
        localStorage.removeItem('lyricsColorHistory');
        localStorage.removeItem('lyricsCurrentColor');
    } catch (e) {
        // Silently handle localStorage errors
    }
    
    window.lyricsColorManager = new LyricsColorManager();
});
