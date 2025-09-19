const lyricsContainer = document.getElementById('lyrics-container');
const addLyricsBtn = document.getElementById('add-lyrics-btn');
let lyricsCount = 0;

addLyricsItem();
function addLyricsItem() {
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
    
    // Show success toast
    if (typeof showSuccess === 'function') {
        showSuccess('Lyrics Added', `Lyrics item ${lyricsCount} has been added successfully!`);
    }
}

function removeLyricsItem(button) {
    const lyricsItem = button.closest('.lyrics-item');
    const lyricsTitle = lyricsItem.querySelector('.lyrics-item-title').textContent;
    lyricsItem.remove();
    updateLyricsData();
    
    // Show info toast
    if (typeof showInfo === 'function') {
        showInfo('Lyrics Removed', `${lyricsTitle} has been removed successfully!`);
    }
}

function timeToSeconds(timeString) {
    if (!timeString || timeString === '') return 0;
    
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes * 60 + seconds;
}

function secondsToTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function updateLyricsData() {
    const lyricsItems = lyricsContainer.querySelectorAll('.lyrics-item');
    const lyricsData = [];
    
    lyricsItems.forEach((item, index) => {
        const timeInputs = item.querySelectorAll('.time-input');
        const startTimeString = timeInputs[0]?.value || '00:00';
        const endTimeString = timeInputs[1]?.value || '';
        const text = item.querySelector('.lyrics-text-input')?.value.trim() || '';
        
        if (text) {
            const startTime = timeToSeconds(startTimeString);
            let endTime;
            
            if (endTimeString === '') {
                endTime = startTime + 5;
            } else {
                endTime = timeToSeconds(endTimeString);
            }
            
            lyricsData.push({
                start: startTime,
                end: endTime,
                text: text
            });
        }
    });
    
    sendLyricsToPlayer(lyricsData);
}

function sendLyricsToPlayer(lyricsData) {
    window.postMessage({
        type: 'UPDATE_LYRICS',
        lyrics: lyricsData
    }, '*');
}
addLyricsBtn.addEventListener('click', addLyricsItem);

const devLyricsBtn = document.getElementById('dev-lyrics-btn');
const devLyricsModal = document.getElementById('dev-lyrics-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalImportBtn = document.getElementById('modal-import-btn');
const jsonLyricsInput = document.getElementById('json-lyrics-input');
devLyricsBtn.addEventListener('click', function() {
    devLyricsModal.style.display = 'flex';
    jsonLyricsInput.focus();
});

function closeModal() {
    devLyricsModal.style.display = 'none';
    jsonLyricsInput.value = '';
}

modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

devLyricsModal.addEventListener('click', function(e) {
    if (e.target === devLyricsModal) {
        closeModal();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && devLyricsModal.style.display === 'flex') {
        closeModal();
    }
});
modalImportBtn.addEventListener('click', function() {
    const jsonText = jsonLyricsInput.value.trim();
    
    if (!jsonText) {
        if (typeof showWarning === 'function') {
            showWarning('Input Required', 'Please paste your JSON lyrics first.');
        } else {
            alert('Please paste your JSON lyrics first.');
        }
        return;
    }
    
    try {
        const lyricsData = JSON.parse(jsonText);
        
        if (!Array.isArray(lyricsData)) {
            throw new Error('JSON must be an array of objects');
        }
        
        for (let i = 0; i < lyricsData.length; i++) {
            const item = lyricsData[i];
            if (typeof item !== 'object' || item === null) {
                throw new Error(`Item at index ${i} must be an object`);
            }
            
            if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
                throw new Error(`Item at index ${i} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
            }
            
            const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
            if (!timeRegex.test(item.start) || !timeRegex.test(item.end)) {
                throw new Error(`Item at index ${i} has invalid time format. Use mm:ss format (e.g., "01:30")`);
            }
            
            const startSeconds = timeToSeconds(item.start);
            const endSeconds = timeToSeconds(item.end);
            
            if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                throw new Error(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
            }
        }
        
        lyricsContainer.innerHTML = '';
        lyricsCount = 0;
        lyricsData.forEach((item, index) => {
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
        
        updateLyricsData();
        closeModal();
        
        // Show success toast
        if (typeof showSuccess === 'function') {
            showSuccess('Import Successful', `Successfully imported ${lyricsData.length} lyrics items!`);
        } else {
            alert(`Successfully imported ${lyricsData.length} lyrics items!`);
        }
        
    } catch (error) {
        // Show error toast
        if (typeof showError === 'function') {
            showError('Import Failed', 'Error parsing JSON: ' + error.message);
        } else {
            alert('Error parsing JSON: ' + error.message);
        }
    }
});
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('album-art');
const audioUploadArea = document.getElementById('audio-upload-area');
const audioFileInput = document.getElementById('audio-file');

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#667eea';
    this.style.background = 'rgba(102, 126, 234, 0.1)';
});

uploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.background = '#f7fafc';
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.background = '#f7fafc';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        updateUploadDisplay(files[0]);
    }
});

fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        updateUploadDisplay(this.files[0]);
    }
});

audioUploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#667eea';
    this.style.background = 'rgba(102, 126, 234, 0.1)';
});

audioUploadArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.background = '#f7fafc';
});

audioUploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#cbd5e0';
    this.style.background = '#f7fafc';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        audioFileInput.files = files;
        updateAudioUploadDisplay(files[0]);
    }
});

audioFileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        updateAudioUploadDisplay(this.files[0]);
    }
});

function updateUploadDisplay(file) {
    const uploadText = uploadArea.querySelector('.upload-text');
    const uploadHint = uploadArea.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    uploadArea.style.borderColor = '#38a169';
    uploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
    
    sendAlbumArtToPlayer(file);
    
    // Show success toast
    if (typeof showSuccess === 'function') {
        showSuccess('Album Art Uploaded', `Successfully uploaded "${file.name}" as album art!`);
    }
}

function updateAudioUploadDisplay(file) {
    const uploadText = audioUploadArea.querySelector('.upload-text');
    const uploadHint = audioUploadArea.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    audioUploadArea.style.borderColor = '#38a169';
    audioUploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
    
    startAutoPlay(file);
    
    // Show success toast
    if (typeof showSuccess === 'function') {
        showSuccess('Audio File Uploaded', `Successfully uploaded "${file.name}" as audio file!`);
    }
}

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
const inputs = document.querySelectorAll('input, textarea');

inputs.forEach(input => {
    input.addEventListener('input', function() {
        sendRealTimeUpdate(input);
    });
    
    input.addEventListener('keyup', function() {
        sendRealTimeUpdate(input);
    });
    
    input.addEventListener('paste', function() {
        setTimeout(() => {
            sendRealTimeUpdate(input);
        }, 10);
    });
});

function sendRealTimeUpdate(input) {
    let updateData = {};
    
    if (input.id === 'song-title') {
        updateData.type = 'UPDATE_SONG_TITLE';
        updateData.songTitle = input.value;
    }
    else if (input.id === 'artist-name') {
        updateData.type = 'UPDATE_ARTIST_NAME';
        updateData.artistName = input.value;
    }
    
    if (updateData.type) {
        window.postMessage(updateData, '*');
    }
}

function sendAlbumArtToPlayer(file) {
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        
        window.postMessage({
            type: 'UPDATE_ALBUM_ART',
            imageUrl: imageUrl
        }, '*');
    }
}

function sendRemoveAlbumArtToPlayer() {
    window.postMessage({
        type: 'REMOVE_ALBUM_ART'
    }, '*');
}

const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportProgress = document.getElementById('export-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

function updateExportButtonState() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    
    if (audioFile && songTitle) {
        exportBtn.disabled = false;
    } else {
        exportBtn.disabled = true;
    }
}

document.getElementById('audio-file').addEventListener('change', updateExportButtonState);
document.getElementById('song-title').addEventListener('input', updateExportButtonState);

debugBtn.addEventListener('click', function() {
    window.postMessage({
        type: 'DEBUG_BROWSER_SUPPORT'
    }, '*');
});
exportBtn.addEventListener('click', async function() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    const artistName = document.getElementById('artist-name').value.trim();
    const albumArtFile = document.getElementById('album-art').files[0];
    
    if (!audioFile || !songTitle) {
        if (typeof showWarning === 'function') {
            showWarning('Missing Information', 'Please upload an audio file and enter a song title before exporting.');
        } else {
            alert('Please upload an audio file and enter a song title before exporting.');
        }
        return;
    }

    exportProgress.style.display = 'block';
    exportBtn.disabled = true;
    
    // Show info toast
    if (typeof showInfo === 'function') {
        showInfo('Export Started', 'Video export has started. Please wait...');
    }
    
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
        alert('Export failed. Please try again.');
        exportProgress.style.display = 'none';
        exportBtn.disabled = false;
    }
});

let isExportCompleted = false;

function handleExportComplete(videoBlob, fileName) {
    if (isExportCompleted) {
        return;
    }
    isExportCompleted = true;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    exportProgress.style.display = 'none';
    exportBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing export...';
    
    // Show success toast
    if (typeof showSuccess === 'function') {
        showSuccess('Export Complete', `WebM video "${fileName}" exported successfully!`);
    } else {
        alert('WebM video exported successfully!');
    }
    
    setTimeout(() => {
        isExportCompleted = false;
    }, 2000);
}

if (!window.exportMessageListenerAdded) {
    window.exportMessageListenerAdded = true;
    
    const settingsContainer = document.querySelector('.left-panel');
    if (settingsContainer) {
        settingsContainer.addEventListener('exportMessage', function(event) {
            const data = event.detail;
            if (data.type === 'EXPORT_PROGRESS') {
                const progress = data.progress;
                const message = data.message;
                
                progressFill.style.width = progress + '%';
                progressText.textContent = message;
            } else if (data.type === 'EXPORT_COMPLETE') {
                const videoBlob = data.videoBlob;
                const fileName = data.fileName;
                handleExportComplete(videoBlob, fileName);
            } else if (data.type === 'EXPORT_ERROR') {
                const error = data.error;
                
                // Show error toast
                if (typeof showError === 'function') {
                    showError('Export Failed', 'Export failed: ' + error);
                } else {
                    alert('Export failed: ' + error);
                }
                
                exportProgress.style.display = 'none';
                exportBtn.disabled = false;
                progressFill.style.width = '0%';
                progressText.textContent = 'Preparing export...';
            }
        });
    }
}

// Lyrics Color Management
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
    
    initializeElements() {
        this.colorPicker = document.getElementById('lyrics-color-picker');
        this.colorPreview = document.getElementById('color-preview');
        this.colorHistoryContainer = document.getElementById('color-history');
        this.copyHexBtn = document.getElementById('copy-hex-btn');
    }
    
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
    
    updateColorPreviewOnly(color) {
        // Only update preview and send to player, don't save to history
        this.currentColor = color;
        this.updateColorPreview();
        this.sendColorToPlayer();
    }
    
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
    
    updateColorPreview() {
        this.colorPreview.textContent = this.currentColor.toUpperCase();
        this.colorPreview.style.backgroundColor = this.currentColor;
        this.colorPreview.style.color = this.getContrastColor(this.currentColor);
        this.colorPicker.value = this.currentColor;
    }
    
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    renderColorHistory() {
        this.colorHistoryContainer.innerHTML = '';
        
        // Only show color history section if there are colors
        const colorHistorySection = document.querySelector('.color-history-section');
        
        
        if (this.colorHistory.length === 0) {
            colorHistorySection.style.display = 'none';
            return;
        } else {
            colorHistorySection.style.display = 'block';
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
    
    sendColorToPlayer() {
        window.postMessage({
            type: 'UPDATE_LYRICS_COLOR',
            color: this.currentColor
        }, '*');
    }
    
    // Local Storage Methods
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
    
    saveColorHistory() {
        try {
            localStorage.setItem('lyricsColorHistory', JSON.stringify(this.colorHistory));
        } catch (e) {
        }
    }
    
    loadCurrentColor() {
        try {
            return localStorage.getItem('lyricsCurrentColor') || '#ffb3d1';
        } catch (e) {
            return '#ffb3d1';
        }
    }
    
    saveCurrentColor() {
        try {
            localStorage.setItem('lyricsCurrentColor', this.currentColor);
        } catch (e) {
        }
    }
    
    getCurrentColor() {
        return this.currentColor;
    }
    
    cleanupOldDefaultColors() {
        // Force clear any existing color history to start fresh
        this.colorHistory = [];
        this.saveColorHistory();
        
        // Also clear any old default colors from localStorage
        try {
            localStorage.removeItem('lyricsColorHistory');
        } catch (e) {
        }
    }
    
    async copyHexToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentColor);
            
            // Visual feedback
            const originalIcon = this.copyHexBtn.querySelector('.copy-icon').textContent;
            this.copyHexBtn.classList.add('copied');
            this.copyHexBtn.querySelector('.copy-icon').textContent = '✓';
            
            // Show success toast
            if (typeof showSuccess === 'function') {
                showSuccess('Color Copied', `Hex color ${this.currentColor} copied to clipboard!`);
            }
            
            // Reset after 2 seconds
            setTimeout(() => {
                this.copyHexBtn.classList.remove('copied');
                this.copyHexBtn.querySelector('.copy-icon').textContent = originalIcon;
            }, 2000);
            
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.currentColor;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Visual feedback for fallback
            const originalIcon = this.copyHexBtn.querySelector('.copy-icon').textContent;
            this.copyHexBtn.classList.add('copied');
            this.copyHexBtn.querySelector('.copy-icon').textContent = '✓';
            
            // Show success toast
            if (typeof showSuccess === 'function') {
                showSuccess('Color Copied', `Hex color ${this.currentColor} copied to clipboard!`);
            }
            
            setTimeout(() => {
                this.copyHexBtn.classList.remove('copied');
                this.copyHexBtn.querySelector('.copy-icon').textContent = originalIcon;
            }, 2000);
        }
    }
}

// Initialize color manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Force clear localStorage first
    try {
        localStorage.removeItem('lyricsColorHistory');
        localStorage.removeItem('lyricsCurrentColor');
    } catch (e) {
    }
    
    window.lyricsColorManager = new LyricsColorManager();
});
