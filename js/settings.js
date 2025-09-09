// Lyrics management
const lyricsContainer = document.getElementById('lyrics-container');
const addLyricsBtn = document.getElementById('add-lyrics-btn');
let lyricsCount = 0;

// Add first lyrics item by default
addLyricsItem();

// Add lyrics item function
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
}

// Remove lyrics item function
function removeLyricsItem(button) {
    const lyricsItem = button.closest('.lyrics-item');
    lyricsItem.remove();
    updateLyricsData();
}

// Function to convert mm:ss to seconds
function timeToSeconds(timeString) {
    if (!timeString || timeString === '') return 0;
    
    // Handle format like "1:30" or "01:30"
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    
    return minutes * 60 + seconds;
}

// Function to convert seconds to mm:ss
function secondsToTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update lyrics data function
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
                // If no end time entered, default to +5 seconds
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
    
    // Send lyrics data to vinyl player
    sendLyricsToPlayer(lyricsData);
}

// Send lyrics to vinyl player
function sendLyricsToPlayer(lyricsData) {
    // Send message to the same window since this is a single page app
    window.postMessage({
        type: 'UPDATE_LYRICS',
        lyrics: lyricsData
    }, '*');
}

// Add lyrics button event listener
addLyricsBtn.addEventListener('click', addLyricsItem);

// Dev lyrics functionality
const devLyricsBtn = document.getElementById('dev-lyrics-btn');
const devLyricsModal = document.getElementById('dev-lyrics-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalImportBtn = document.getElementById('modal-import-btn');
const jsonLyricsInput = document.getElementById('json-lyrics-input');

// Open dev lyrics modal
devLyricsBtn.addEventListener('click', function() {
    devLyricsModal.style.display = 'flex';
    jsonLyricsInput.focus();
});

// Close modal functions
function closeModal() {
    devLyricsModal.style.display = 'none';
    jsonLyricsInput.value = '';
}

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
    if (e.key === 'Escape' && devLyricsModal.style.display === 'flex') {
        closeModal();
    }
});

// Import JSON lyrics
modalImportBtn.addEventListener('click', function() {
    const jsonText = jsonLyricsInput.value.trim();
    
    if (!jsonText) {
        alert('Please paste your JSON lyrics first.');
        return;
    }
    
    try {
        const lyricsData = JSON.parse(jsonText);
        
        // Validate JSON structure
        if (!Array.isArray(lyricsData)) {
            throw new Error('JSON must be an array of objects');
        }
        
        // Validate each object in the array
        for (let i = 0; i < lyricsData.length; i++) {
            const item = lyricsData[i];
            if (typeof item !== 'object' || item === null) {
                throw new Error(`Item at index ${i} must be an object`);
            }
            
            if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
                throw new Error(`Item at index ${i} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
            }
            
            // Validate mm:ss format
            const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
            if (!timeRegex.test(item.start) || !timeRegex.test(item.end)) {
                throw new Error(`Item at index ${i} has invalid time format. Use mm:ss format (e.g., "01:30")`);
            }
            
            // Convert to seconds for comparison
            const startSeconds = timeToSeconds(item.start);
            const endSeconds = timeToSeconds(item.end);
            
            if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                throw new Error(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
            }
        }
        
        // Clear existing lyrics
        lyricsContainer.innerHTML = '';
        lyricsCount = 0;
        
        // Create lyrics items from JSON data
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
        
        // Update lyrics data
        updateLyricsData();
        
        // Close modal
        closeModal();
        
        // Show success message
        alert(`Successfully imported ${lyricsData.length} lyrics items!`);
        
    } catch (error) {
        alert('Error parsing JSON: ' + error.message);
        console.error('JSON parsing error:', error);
    }
});

// File upload handling
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

// Audio file upload handling
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
    
    // Send album art to vinyl player
    sendAlbumArtToPlayer(file);
}

function updateAudioUploadDisplay(file) {
    const uploadText = audioUploadArea.querySelector('.upload-text');
    const uploadHint = audioUploadArea.querySelector('.upload-hint');
    
    uploadText.textContent = file.name;
    uploadHint.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    audioUploadArea.style.borderColor = '#38a169';
    audioUploadArea.style.background = 'rgba(56, 161, 105, 0.05)';
    
    // Auto play when file is uploaded
    startAutoPlay(file);
}

function removeFile(inputId) {
    const input = document.getElementById(inputId);
    const targetUploadArea = inputId === 'audioFile' ? audioUploadArea : uploadArea;
    
    // Clear file input
    input.value = '';
    
    // Reset upload area display
    const uploadText = targetUploadArea.querySelector('.upload-text');
    const uploadHint = targetUploadArea.querySelector('.upload-hint');
    
    if (inputId === 'audioFile') {
        uploadText.textContent = 'Upload MP3 File';
        uploadHint.textContent = 'Click to browse or drag & drop';
    } else {
        uploadText.textContent = 'Upload Album Art';
        uploadHint.textContent = 'Click to browse or drag & drop';
        
        // Send remove album art message to vinyl player
        sendRemoveAlbumArtToPlayer();
    }
    
    targetUploadArea.style.borderColor = '#cbd5e0';
    targetUploadArea.style.background = '#f7fafc';
}

function startAutoPlay(file) {
    // Create audio URL
    const audioUrl = URL.createObjectURL(file);
    
    // Get current song title and artist name
    const songTitle = document.getElementById('song-title').value;
    const artistName = document.getElementById('artist-name').value;
    
    // Get current album art if exists
    const albumArtFile = document.getElementById('album-art').files[0];
    let albumArtUrl = null;
    if (albumArtFile) {
        albumArtUrl = URL.createObjectURL(albumArtFile);
    }
    
    // Send message to the same window since this is a single page app
    const messageData = {
        type: 'START_PLAY',
        audioUrl: audioUrl,
        songTitle: songTitle,
        artistName: artistName
    };
    
    // Add album art if exists
    if (albumArtUrl) {
        messageData.albumArtUrl = albumArtUrl;
    }
    
    window.postMessage(messageData, '*');
}

// Real-time updates
const inputs = document.querySelectorAll('input, textarea');

inputs.forEach(input => {
    // Handle input events (typing, pasting, etc.)
    input.addEventListener('input', function() {
        // Send real-time updates to vinyl player
        sendRealTimeUpdate(input);
    });
    
    // Handle keyup events (for delete/backspace)
    input.addEventListener('keyup', function() {
        sendRealTimeUpdate(input);
    });
    
    // Handle paste events
    input.addEventListener('paste', function() {
        // Use setTimeout to ensure pasted content is processed
        setTimeout(() => {
            sendRealTimeUpdate(input);
        }, 10);
    });
});

// Function to send real-time updates to vinyl player
function sendRealTimeUpdate(input) {
    let updateData = {};
    
    // Check if it's song title input
    if (input.id === 'song-title') {
        updateData.type = 'UPDATE_SONG_TITLE';
        updateData.songTitle = input.value; // This will be empty string if cleared
    }
    // Check if it's artist name input
    else if (input.id === 'artist-name') {
        updateData.type = 'UPDATE_ARTIST_NAME';
        updateData.artistName = input.value; // This will be empty string if cleared
    }
    
    // Send message if we have update data (even if empty)
    if (updateData.type) {
        window.postMessage(updateData, '*');
    }
}

// Function to send album art to vinyl player
function sendAlbumArtToPlayer(file) {
    if (file) {
        // Create object URL for the image
        const imageUrl = URL.createObjectURL(file);
        
        // Send message to vinyl player
        window.postMessage({
            type: 'UPDATE_ALBUM_ART',
            imageUrl: imageUrl
        }, '*');
    }
}

// Function to send remove album art message to vinyl player
function sendRemoveAlbumArtToPlayer() {
    // Send message to vinyl player to remove album art
    window.postMessage({
        type: 'REMOVE_ALBUM_ART'
    }, '*');
}

// Export MP4 functionality
const exportBtn = document.getElementById('export-btn');
const debugBtn = document.getElementById('debug-btn');
const exportProgress = document.getElementById('export-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Enable export button when audio file is loaded
function updateExportButtonState() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    
    if (audioFile && songTitle) {
        exportBtn.disabled = false;
    } else {
        exportBtn.disabled = true;
    }
}

// Update export button state on input changes
document.getElementById('audio-file').addEventListener('change', updateExportButtonState);
document.getElementById('song-title').addEventListener('input', updateExportButtonState);

// Debug button click handler
debugBtn.addEventListener('click', function() {
    window.postMessage({
        type: 'DEBUG_BROWSER_SUPPORT'
    }, '*');
});

// Export button click handler
exportBtn.addEventListener('click', async function() {
    const audioFile = document.getElementById('audio-file').files[0];
    const songTitle = document.getElementById('song-title').value.trim();
    const artistName = document.getElementById('artist-name').value.trim();
    const albumArtFile = document.getElementById('album-art').files[0];
    
    if (!audioFile || !songTitle) {
        alert('Please upload an audio file and enter a song title before exporting.');
        return;
    }

    // Show progress
    exportProgress.style.display = 'block';
    exportBtn.disabled = true;
    
    // Auto scroll to progress bar for better visibility
    setTimeout(() => {
        exportProgress.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }, 100);
    
    try {
        // Send export request to vinyl player
        const exportData = {
            type: 'EXPORT_MP4',
            audioFile: audioFile,
            songTitle: songTitle,
            artistName: artistName,
            albumArtFile: albumArtFile
        };
        
        window.postMessage(exportData, '*');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
        exportProgress.style.display = 'none';
        exportBtn.disabled = false;
    }
});

// Flag to prevent duplicate downloads
let isExportCompleted = false;

// Function to handle export completion
function handleExportComplete(videoBlob, fileName) {
    // Prevent duplicate downloads
    if (isExportCompleted) {
        return;
    }
    isExportCompleted = true;
    
    // Download the video
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Reset UI
    exportProgress.style.display = 'none';
    exportBtn.disabled = false;
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing export...';
    
    alert('Video exported successfully!');
    
    // Reset flag after a delay
    setTimeout(() => {
        isExportCompleted = false;
    }, 2000);
}

// Listen for export progress updates from vinyl player (only once)
if (!window.exportMessageListenerAdded) {
    window.exportMessageListenerAdded = true;
    
    // Listen for custom events from index.js
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
                alert('Export failed: ' + error);
                
                // Reset UI
                exportProgress.style.display = 'none';
                exportBtn.disabled = false;
                progressFill.style.width = '0%';
                progressText.textContent = 'Preparing export...';
            }
        });
    }
}
