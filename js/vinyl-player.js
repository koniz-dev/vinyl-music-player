// Vinyl Music Player JavaScript
let isPlaying = false;
let currentTime = 0; // seconds
let totalTime = 0; // seconds
let progressInterval;
let lyricsInterval;
// No longer need currentLyricIndex as lyrics are managed by timestamp
let audioElement = null;
let isMuted = false;
let isRepeat = false;
let isExporting = false; // Flag to prevent duplicate exports

// Lyrics array will be updated from settings
let lyrics = [];

const vinyl = document.getElementById('vinyl');
const tonearm = document.getElementById('tonearm');
const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
const progress = document.querySelector('.vinyl-progress');
const currentTimeEl = document.querySelector('.vinyl-current-time');
const visualizer = document.getElementById('visualizer');
const progressBar = document.querySelector('.vinyl-progress-bar');
const lyricsText = document.querySelector('.vinyl-lyrics-text');
const muteBtn = document.querySelector('.vinyl-mute-btn');
const repeatBtn = document.querySelector('.vinyl-repeat-btn');

// Initialize player
function init() {
    updateProgress();
    updateTonearm();
    updateLyrics(); // Will show empty lyrics if not playing music
    updateVisualizerPosition(); // Set initial visualizer position
    if (isPlaying) {
        startProgressTimer();
        startLyricsTimer();
    }
}

// Function to update lyrics based on current time
function updateLyrics() {
    // Only show lyrics when music is loaded and playing
    if (!audioElement || !isPlaying) {
        lyricsText.textContent = '';
        updateVisualizerPosition(); // Update visualizer position
        return;
    }

    // Find lyrics that match current time
    const currentLyric = getCurrentLyric(currentTime);
    
    if (currentLyric) {
        // Found lyrics that match current time
        if (currentLyric.text !== lyricsText.textContent) {
            // Add fade out/in effect when changing lyrics
            lyricsText.style.opacity = '0.5';
            setTimeout(() => {
                lyricsText.textContent = currentLyric.text;
                lyricsText.style.opacity = '1';
                updateVisualizerPosition(); // Update visualizer position
            }, 150);
        }
    } else {
        // No lyrics match current time
        if (lyricsText.textContent !== '') {
            lyricsText.textContent = '';
            updateVisualizerPosition(); // Update visualizer position
        }
    }
}

// Function to find current lyrics based on time
function getCurrentLyric(time) {
    // Check if lyrics array is empty
    if (!lyrics || lyrics.length === 0) {
        return null;
    }
    
    for (let i = 0; i < lyrics.length; i++) {
        // Check if lyrics[i] element exists and has start, end properties
        if (lyrics[i] && typeof lyrics[i].start !== 'undefined' && typeof lyrics[i].end !== 'undefined') {
            // Only show lyrics in exact time range [start, end)
            if (time >= lyrics[i].start && time < lyrics[i].end) {
                return lyrics[i];
            }
        }
    }
    
    // If no matching lyrics found (before start, in gap, after end), return null
    return null;
}

// Function to start lyrics timer (no longer needed as integrated with timeupdate)
function startLyricsTimer() {
    // Lyrics are now updated through timeupdate event
}

// Function to stop lyrics timer (no longer needed)
function stopLyricsTimer() {
    // Lyrics are now updated through timeupdate event
}

function restartAudio() {
    if (!audioElement) return;
    
    audioElement.currentTime = 0;
    currentTime = 0;
    updateProgress();
    
    // Small delay to ensure reset is complete
    setTimeout(() => {
        audioElement.play().then(() => {
            isPlaying = true;
            updatePlayerState();
            startProgressTimer();
            startLyricsTimer();
        }).catch(error => {
            isPlaying = false;
            updatePlayerState();
        });
    }, 100);
}

function togglePlayPause() {
    if (!audioElement) return;
    
    if (isPlaying) {
        // Currently playing, so pause
        audioElement.pause();
        isPlaying = false;
        updatePlayerState();
        stopProgressTimer();
        stopLyricsTimer();
    } else {
        // Currently paused, so play
        if (audioElement.ended) {
            restartAudio();
        } else {
            // Use promise to handle play properly
            audioElement.play().then(() => {
                isPlaying = true;
                updatePlayerState();
                startProgressTimer();
                startLyricsTimer();
            }).catch(error => {
                isPlaying = false;
                updatePlayerState();
            });
        }
    }
}

function startProgressTimer() {
    // Progress is now handled by audio timeupdate event
    // This function is kept for compatibility
}

function stopProgressTimer() {
    clearInterval(progressInterval);
}

function updateProgress() {
    if (totalTime > 0) {
        const progressPercent = (currentTime / totalTime) * 100;
        progress.style.width = `${progressPercent}%`;
    }
    currentTimeEl.textContent = formatTime(currentTime);
}

function updateTonearm() {
    if (isPlaying) {
        tonearm.classList.add('playing');
    } else {
        tonearm.classList.remove('playing');
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Progress bar click (optimized with throttling)
let isProgressUpdating = false;
progressBar.addEventListener('click', (e) => {
    if (isProgressUpdating || !audioElement) return;
    isProgressUpdating = true;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = Math.floor(percent * totalTime);
    
    // Update both currentTime and audioElement.currentTime
    currentTime = newTime;
    audioElement.currentTime = newTime;
    updateProgress();
    
    setTimeout(() => {
        isProgressUpdating = false;
    }, 100);
});

function previousTrack() {
    currentTime = 0;
    updateProgress();
    updateLyrics(); // Will show empty lyrics if not playing music
    // Add track switching logic here
    // createParticles();
}

function nextTrack() {
    currentTime = 0;
    updateProgress();
    updateLyrics(); // Will show empty lyrics if not playing music
    // Add track switching logic here
    // createParticles();
}

// Create floating particles effect (optimized)
function createParticles() {
    const vinylSection = document.querySelector('.vinyl-section');
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < 6; i++) { // Reduced from 10 to 6 particles
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 2 + 's';
        fragment.appendChild(particle);
    }
    
    vinylSection.appendChild(fragment);
    
    // Clean up particles after animation
    setTimeout(() => {
        const particles = vinylSection.querySelectorAll('.particle');
        particles.forEach(particle => particle.remove());
    }, 3000);
}

// Message listener for auto play and real-time updates
window.addEventListener('message', function(event) {
    if (event.data.type === 'START_PLAY') {
        startPlaying(event.data);
    } else if (event.data.type === 'UPDATE_SONG_TITLE') {
        updateSongTitle(event.data.songTitle);
    } else if (event.data.type === 'UPDATE_ARTIST_NAME') {
        updateArtistName(event.data.artistName);
    } else if (event.data.type === 'UPDATE_ALBUM_ART') {
        updateAlbumArt(event.data.imageUrl);
    } else if (event.data.type === 'REMOVE_ALBUM_ART') {
        removeAlbumArt();
    } else if (event.data.type === 'UPDATE_LYRICS') {
        updateLyricsFromSettings(event.data.lyrics);
    } else if (event.data.type === 'DEBUG_BROWSER_SUPPORT') {
        debugBrowserSupport();
    } else if (event.data.type === 'EXPORT_MP4') {
        // Prevent duplicate exports
        if (isExporting) {
            return;
        }
        
        const { audioFile, songTitle, artistName, albumArtFile } = event.data;
        
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
            window.postMessage({
                type: 'EXPORT_ERROR',
                error: 'MediaRecorder API is not supported in this browser. Please use Chrome, Firefox, or Edge.'
            }, '*');
            return;
        }
        
        // Update UI with export data
        if (songTitle) {
            document.querySelector('.vinyl-song-title').textContent = songTitle;
        }
        if (artistName) {
            document.querySelector('.vinyl-artist-name').textContent = artistName;
        }
        
        // Start recording
        startVideoRecording(audioFile, songTitle, artistName, albumArtFile);
    }
});

// Function to update song title in real-time
function updateSongTitle(title) {
    const songTitleElement = document.querySelector('.vinyl-song-title');
    if (songTitleElement) {
        songTitleElement.textContent = title || ''; // Show empty string if title is empty
    }
    // Update visualizer position after title change
    updateVisualizerPosition();
}

// Function to update artist name in real-time
function updateArtistName(artist) {
    const artistNameElement = document.querySelector('.vinyl-artist-name');
    if (artistNameElement) {
        artistNameElement.textContent = artist || ''; // Show empty string if artist is empty
    }
    // Update visualizer position after artist change
    updateVisualizerPosition();
}

// Function to update lyrics from settings
function updateLyricsFromSettings(newLyrics) {
    // Always update the global lyrics array, even if newLyrics is empty
    lyrics.length = 0; // Clear existing lyrics
    
    if (newLyrics && newLyrics.length > 0) {
        // Only add valid lyrics (with start, end, text)
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
    
    // Update lyrics display if music is loaded
    if (audioElement) {
        // Only show lyrics if playing music and have lyrics matching current time
        if (isPlaying) {
            updateLyrics();
        } else {
            // If not playing music, empty lyrics but still occupy space
            lyricsText.textContent = '';
            updateVisualizerPosition();
        }
    } else {
        // If no music, empty lyrics but still occupy space
        lyricsText.textContent = '';
        updateVisualizerPosition();
    }
}

// Function to update visualizer position based on content
function updateVisualizerPosition() {
    const songTitleElement = document.querySelector('.vinyl-song-title');
    const artistNameElement = document.querySelector('.vinyl-artist-name');
    const lyricsTextElement = document.querySelector('.vinyl-lyrics-text');
    const visualizer = document.getElementById('visualizer');
    
    if (songTitleElement && artistNameElement && lyricsTextElement && visualizer) {
        const hasTitle = songTitleElement.textContent.trim() !== '';
        const hasArtist = artistNameElement.textContent.trim() !== '';
        const hasLyrics = lyricsTextElement.textContent.trim() !== '';
        
        let bottomValue;
        if (hasTitle && hasArtist) {
            bottomValue = '136px'; // Title and artist present
        } else if (hasTitle || hasArtist) {
            bottomValue = '128px'; // Either title or artist present
        } else {
            bottomValue = '88px'; // Neither present
        }
        
        visualizer.style.bottom = bottomValue;
    }
}

// Function to update album art
function updateAlbumArt(imageUrl) {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer && imageUrl) {
        // Set background image for music player with beautiful effects
        musicPlayer.style.backgroundImage = `url(${imageUrl})`;
        musicPlayer.style.backgroundSize = 'cover';
        musicPlayer.style.backgroundPosition = 'center';
        musicPlayer.style.backgroundRepeat = 'no-repeat';
        
        // Add beautiful overlay effects
        musicPlayer.style.position = 'relative';
        
        // Create or update overlay
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
                    rgba(0, 0, 0, 0.4) 0%, 
                    rgba(0, 0, 0, 0.6) 50%, 
                    rgba(0, 0, 0, 0.4) 100%);
                backdrop-filter: blur(2px);
                border-radius: 30px;
                pointer-events: none;
                z-index: 1;
            `;
            musicPlayer.appendChild(overlay);
        }
        
        // Ensure content is above overlay
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
        // Set background image for album art with subtle effects
        albumArt.style.backgroundImage = `url(${imageUrl})`;
        albumArt.style.backgroundSize = 'cover';
        albumArt.style.backgroundPosition = 'center';
        albumArt.style.backgroundRepeat = 'no-repeat';
        albumArt.style.borderRadius = '50%';
        albumArt.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }
}

// Function to remove album art
function removeAlbumArt() {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer) {
        // Remove background image from music player
        musicPlayer.style.backgroundImage = '';
        musicPlayer.style.backgroundSize = '';
        musicPlayer.style.backgroundPosition = '';
        musicPlayer.style.backgroundRepeat = '';
        
        // Remove overlay
        const overlay = musicPlayer.querySelector('.album-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Reset z-index for content
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
        // Remove background image and effects from album art
        albumArt.style.backgroundImage = '';
        albumArt.style.backgroundSize = '';
        albumArt.style.backgroundPosition = '';
        albumArt.style.backgroundRepeat = '';
        albumArt.style.borderRadius = '';
        albumArt.style.boxShadow = '';
    }
}

function startPlaying(data) {
    // Create audio element
    audioElement = new Audio(data.audioUrl);
    
    // Update song title and artist name if provided
    if (data.songTitle !== undefined) {
        updateSongTitle(data.songTitle);
    }
    if (data.artistName !== undefined) {
        updateArtistName(data.artistName);
    }
    
    // Update album art if provided
    if (data.albumArtUrl) {
        updateAlbumArt(data.albumArtUrl);
    }
    
    // Update visualizer position after all updates
    updateVisualizerPosition();
    
    // Enable controls
    enableControls();
    
    // Set up audio events
    audioElement.addEventListener('loadedmetadata', function() {
        totalTime = Math.floor(audioElement.duration);
        document.querySelector('.vinyl-total-time').textContent = formatTime(totalTime);
    });
    
    audioElement.addEventListener('timeupdate', function() {
        currentTime = Math.floor(audioElement.currentTime);
        updateProgress();
        updateLyrics(); // Update lyrics in real time
    });
    
    audioElement.addEventListener('ended', function() {
        if (isRepeat) {
            // Repeat current track
            audioElement.currentTime = 0;
            audioElement.play();
        } else {
            // Stop completely when song ends
            isPlaying = false;
            updatePlayerState();
            stopProgressTimer();
            stopLyricsTimer();
            updateTonearm();
            // Reset current time for next play
            currentTime = 0;
            updateProgress();
        }
    });
    
    // Start playing
    audioElement.play().then(() => {
        isPlaying = true;
        updatePlayerState();
        startProgressTimer();
        startLyricsTimer();
    });
    
    // Update lyrics immediately when music is loaded
    updateLyrics();
}

function enableControls() {
    const controls = document.querySelectorAll('.control-btn');
    controls.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
    
    // Reset button states
    muteBtn.textContent = '🔊';
    muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    repeatBtn.style.color = 'white';
    isRepeat = false;
}

function updatePlayerState() {
    const vinyl = document.getElementById('vinyl');
    const tonearm = document.getElementById('tonearm');
    const visualizer = document.getElementById('visualizer');
    const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
    
    if (isPlaying) {
        vinyl.style.animation = 'spin 8s linear infinite';
        tonearm.classList.add('playing');
        visualizer.style.display = 'flex';
        playPauseBtn.textContent = '⏸';
    } else {
        vinyl.style.animation = 'none';
        tonearm.classList.remove('playing');
        visualizer.style.display = 'none';
        playPauseBtn.textContent = '▶';
    }
    
    // Update lyrics when playback state changes
    updateLyrics();
}

// Event listeners for buttons
playPauseBtn.addEventListener('click', function() {
    togglePlayPause();
});

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

// Initialize the player
init();
