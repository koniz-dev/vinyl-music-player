/**
 * Vinyl Music Player Module
 * Handles audio playback, lyrics display, and vinyl animations
 */

// Player State Variables
let isPlaying = false;
let currentTime = 0;
let totalTime = 0;
let audioElement = null;
let isMuted = false;
let isRepeat = false;
let isExporting = false;

// Lyrics Data
let lyrics = [];

// DOM Elements
const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
const progress = document.querySelector('.vinyl-progress');
const currentTimeEl = document.querySelector('.vinyl-current-time');
const progressBar = document.querySelector('.vinyl-progress-bar');
const lyricsText = document.querySelector('.vinyl-lyrics-text');
const muteBtn = document.querySelector('.vinyl-mute-btn');
const repeatBtn = document.querySelector('.vinyl-repeat-btn');

/**
 * Initialize the music player
 */
function init() {
    updateProgress();
    updateTonearm();
    updateLyrics();
    // Set default lyrics color
    lyricsText.style.color = '#ffb3d1';
}

/**
 * Update lyrics display based on current time
 */
function updateLyrics() {
    if (!audioElement || !isPlaying) {
        lyricsText.textContent = '';
        return;
    }

    const currentLyric = getCurrentLyric(currentTime);
    
    if (currentLyric) {
        if (currentLyric.text !== lyricsText.textContent) {
            lyricsText.style.opacity = '0.5';
            setTimeout(() => {
                lyricsText.textContent = currentLyric.text;
                lyricsText.style.opacity = '1';
            }, 150);
        }
    } else {
        if (lyricsText.textContent !== '') {
            lyricsText.textContent = '';
        }
    }
}

/**
 * Get the current lyric based on time
 * @param {number} time - Current time in seconds
 * @returns {Object|null} Current lyric object or null
 */
function getCurrentLyric(time) {
    if (!lyrics || lyrics.length === 0) {
        return null;
    }
    
    for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i] && typeof lyrics[i].start !== 'undefined' && typeof lyrics[i].end !== 'undefined') {
            if (time >= lyrics[i].start && time < lyrics[i].end) {
                return lyrics[i];
            }
        }
    }
    
    return null;
}


/**
 * Restart audio from the beginning
 */
function restartAudio() {
    if (!audioElement) return;
    
    audioElement.currentTime = 0;
    currentTime = 0;
    updateProgress();
    
    setTimeout(() => {
        audioElement.play().then(() => {
            isPlaying = true;
            updatePlayerState();
        }).catch(error => {
            isPlaying = false;
            updatePlayerState();
        });
    }, 100);
}

/**
 * Toggle play/pause state
 */
function togglePlayPause() {
    if (!audioElement) return;
    
    if (isPlaying) {
        audioElement.pause();
        isPlaying = false;
        updatePlayerState();
    } else {
        if (audioElement.ended) {
            restartAudio();
        } else {
            audioElement.play().then(() => {
                isPlaying = true;
                updatePlayerState();
            }).catch(error => {
                isPlaying = false;
                updatePlayerState();
            });
        }
    }
}


/**
 * Update progress bar and time display
 */
function updateProgress() {
    if (totalTime > 0) {
        const progressPercent = (currentTime / totalTime) * 100;
        progress.style.width = `${Math.min(progressPercent, 100)}%`;
    }
    currentTimeEl.textContent = formatTime(currentTime);
}

/**
 * Update tonearm animation state
 */
function updateTonearm() {
    if (isPlaying) {
        tonearm.classList.add('playing');
    } else {
        tonearm.classList.remove('playing');
    }
}

/**
 * Format time in seconds to mm:ss format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Progress Bar Click Handler
 */

let isProgressUpdating = false;

/**
 * Handle progress bar click to seek to specific time
 * @param {Event} e - Click event
 */
progressBar.addEventListener('click', (e) => {
    if (isProgressUpdating || !audioElement) return;
    isProgressUpdating = true;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.floor(percent * totalTime);
    
    currentTime = newTime;
    audioElement.currentTime = newTime;
    updateProgress();
    
    setTimeout(() => {
        isProgressUpdating = false;
    }, 100);
});
/**
 * Message Handler
 * Handles communication with the control panel
 */
window.addEventListener('message', function(event) {
    const message = event.data;
    const { type } = message;
    
    switch (type) {
        case 'START_PLAY':
            startPlaying(message);
            break;
        case 'UPDATE_SONG_TITLE':
            updateSongTitle(message.songTitle);
            break;
        case 'UPDATE_ARTIST_NAME':
            updateArtistName(message.artistName);
            break;
        case 'UPDATE_ALBUM_ART':
            updateAlbumArt(message.imageUrl);
            break;
        case 'REMOVE_ALBUM_ART':
            removeAlbumArt();
            break;
        case 'UPDATE_LYRICS':
            updateLyricsFromSettings(message.lyrics);
            break;
        case 'UPDATE_LYRICS_COLOR':
            lyricsText.style.color = message.color;
            break;
        case 'DEBUG_BROWSER_SUPPORT':
            debugBrowserSupport();
            break;
        case 'EXPORT_WEBM':
            handleExportRequest(message);
            break;
    }
});

/**
 * Handle export request from control panel
 * @param {Object} data - Export data
 */
function handleExportRequest(data) {
    if (isExporting) {
        return;
    }
    
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
    
    startVideoRecording(audioFile, songTitle, artistName, albumArtFile);
}

/**
 * Update Functions
 */

/**
 * Update song title display
 * @param {string} title - The song title
 */
function updateSongTitle(title) {
    const songTitleElement = document.querySelector('.vinyl-song-title');
    if (songTitleElement) {
        songTitleElement.textContent = title || '';
    }
}

/**
 * Update artist name display
 * @param {string} artist - The artist name
 */
function updateArtistName(artist) {
    const artistNameElement = document.querySelector('.vinyl-artist-name');
    if (artistNameElement) {
        artistNameElement.textContent = artist || '';
    }
}

/**
 * Update lyrics from settings panel
 * @param {Array} newLyrics - Array of lyrics objects
 */
function updateLyricsFromSettings(newLyrics) {
    lyrics.length = 0;
    
    if (newLyrics && newLyrics.length > 0) {
        newLyrics.forEach(lyric => {
            if (lyric && 
                typeof lyric.start !== 'undefined' && 
                typeof lyric.end !== 'undefined' && 
                typeof lyric.text !== 'undefined' && 
                lyric.text.trim() !== '') {
                lyrics.push(lyric);
            }
        });
    }
    
    if (audioElement) {
        if (isPlaying) {
            updateLyrics();
        } else {
            lyricsText.textContent = '';
        }
    } else {
        lyricsText.textContent = '';
    }
}


/**
 * Update album art display
 * @param {string} imageUrl - URL of the album art image
 */
function updateAlbumArt(imageUrl) {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer && imageUrl) {
        // Set background image for music player
        musicPlayer.style.backgroundImage = `url(${imageUrl})`;
        musicPlayer.style.backgroundSize = 'cover';
        musicPlayer.style.backgroundPosition = 'center';
        musicPlayer.style.backgroundRepeat = 'no-repeat';
        musicPlayer.style.position = 'relative';
        
        // Create overlay for better text readability
        let overlay = musicPlayer.querySelector('.album-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'album-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, 
                    rgba(0, 0, 0, 0.2) 0%, 
                    rgba(0, 0, 0, 0.3) 50%, 
                    rgba(0, 0, 0, 0.2) 100%);
                backdrop-filter: blur(2px);
                border-radius: 30px;
                pointer-events: none;
                z-index: 1;
            `;
            musicPlayer.appendChild(overlay);
        }
        
        // Ensure UI elements are above overlay
        const vinylSection = musicPlayer.querySelector('.vinyl-section');
        const progressContainer = musicPlayer.querySelector('.progress-container');
        const controls = musicPlayer.querySelector('.controls');
        
        if (vinylSection) vinylSection.style.position = 'relative';
        if (vinylSection) vinylSection.style.zIndex = '2';
        if (progressContainer) progressContainer.style.position = 'relative';
        if (progressContainer) progressContainer.style.zIndex = '2';
        if (controls) controls.style.position = 'relative';
        if (controls) controls.style.zIndex = '2';
    }
    
    if (albumArt && imageUrl) {
        // Set album art for vinyl center
        albumArt.style.backgroundImage = `url(${imageUrl})`;
        albumArt.style.backgroundSize = 'cover';
        albumArt.style.backgroundPosition = 'center';
        albumArt.style.backgroundRepeat = 'no-repeat';
        albumArt.style.borderRadius = '50%';
        albumArt.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }
}

/**
 * Remove album art display
 */
function removeAlbumArt() {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer) {
        // Reset music player background
        musicPlayer.style.backgroundImage = '';
        musicPlayer.style.backgroundSize = '';
        musicPlayer.style.backgroundPosition = '';
        musicPlayer.style.backgroundRepeat = '';
        
        // Remove overlay
        const overlay = musicPlayer.querySelector('.album-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Reset z-index for UI elements
        const vinylSection = musicPlayer.querySelector('.vinyl-section');
        const progressContainer = musicPlayer.querySelector('.progress-container');
        const controls = musicPlayer.querySelector('.controls');
        
        if (vinylSection) vinylSection.style.position = '';
        if (vinylSection) vinylSection.style.zIndex = '';
        if (progressContainer) progressContainer.style.position = '';
        if (progressContainer) progressContainer.style.zIndex = '';
        if (controls) controls.style.position = '';
        if (controls) controls.style.zIndex = '';
    }
    
    if (albumArt) {
        // Reset album art styles
        albumArt.style.backgroundImage = '';
        albumArt.style.backgroundSize = '';
        albumArt.style.backgroundPosition = '';
        albumArt.style.backgroundRepeat = '';
        albumArt.style.borderRadius = '';
        albumArt.style.boxShadow = '';
    }
}

/**
 * Start playing audio with given data
 * @param {Object} data - Audio data containing URL, title, artist, and album art
 */
function startPlaying(data) {
    audioElement = new Audio(data.audioUrl);
    
    // Update song information
    if (data.songTitle !== undefined) {
        updateSongTitle(data.songTitle);
    }
    if (data.artistName !== undefined) {
        updateArtistName(data.artistName);
    }
    
    if (data.albumArtUrl) {
        updateAlbumArt(data.albumArtUrl);
    }
    
    enableControls();
    
    // Setup audio event listeners
    audioElement.addEventListener('loadedmetadata', function() {
        totalTime = Math.floor(audioElement.duration);
        document.querySelector('.vinyl-total-time').textContent = formatTime(totalTime);
    });
    
    audioElement.addEventListener('timeupdate', function() {
        currentTime = audioElement.currentTime;
        updateProgress();
        updateLyrics();
    });
    
    audioElement.addEventListener('ended', function() {
        if (isRepeat) {
            audioElement.currentTime = 0;
            audioElement.play();
        } else {
            isPlaying = false;
            updatePlayerState();
            updateTonearm();
            currentTime = 0;
            updateProgress();
        }
    });
    
    // Start playback
    audioElement.play().then(() => {
        isPlaying = true;
        updatePlayerState();
    });
    
    updateLyrics();
}

/**
 * Enable all control buttons
 */
function enableControls() {
    const controls = document.querySelectorAll('.control-btn');
    controls.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
    
    muteBtn.textContent = '🔊';
    muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    repeatBtn.style.color = 'white';
    isRepeat = false;
}

/**
 * Update player state (play/pause, animations)
 */
function updatePlayerState() {
    const vinyl = document.getElementById('vinyl');
    const tonearm = document.getElementById('tonearm');
    const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
    
    if (isPlaying) {
        vinyl.style.animation = 'spin 8s linear infinite';
        tonearm.classList.add('playing');
        playPauseBtn.textContent = '⏸';
    } else {
        vinyl.style.animation = 'none';
        tonearm.classList.remove('playing');
        playPauseBtn.textContent = '▶';
    }
    
    updateLyrics();
}

/**
 * Event Listeners
 */

// Play/Pause button
playPauseBtn.addEventListener('click', function() {
    togglePlayPause();
});

// Mute button
muteBtn.addEventListener('click', function() {
    if (!audioElement) return;
    
    isMuted = !isMuted;
    audioElement.muted = isMuted;
    
    if (isMuted) {
        muteBtn.textContent = '🔇';
        muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    } else {
        muteBtn.textContent = '🔊';
        muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    }
});

// Repeat button
repeatBtn.addEventListener('click', function() {
    if (!audioElement) return;
    
    isRepeat = !isRepeat;
    
    if (isRepeat) {
        repeatBtn.style.background = 'rgba(102, 126, 234, 0.3)';
        repeatBtn.style.color = '#667eea';
    } else {
        repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        repeatBtn.style.color = 'white';
    }
});


/**
 * Initialize the music player
 */
init();
