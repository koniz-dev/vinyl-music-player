let isPlaying = false;
let currentTime = 0;
let totalTime = 0;
let audioElement = null;
let isMuted = false;
let isRepeat = false;
let isExporting = false;

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

function init() {
    updateProgress();
    updateTonearm();
    updateLyrics();
    updateVisualizerPosition();
    if (isPlaying) {
        startProgressTimer();
        startLyricsTimer();
    }
}

function updateLyrics() {
    if (!audioElement || !isPlaying) {
        lyricsText.textContent = '';
        updateVisualizerPosition();
        return;
    }

    const currentLyric = getCurrentLyric(currentTime);
    
    if (currentLyric) {
        if (currentLyric.text !== lyricsText.textContent) {
            lyricsText.style.opacity = '0.5';
            setTimeout(() => {
                lyricsText.textContent = currentLyric.text;
                lyricsText.style.opacity = '1';
                updateVisualizerPosition();
            }, 150);
        }
    } else {
        if (lyricsText.textContent !== '') {
            lyricsText.textContent = '';
            updateVisualizerPosition();
        }
    }
}

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

function startLyricsTimer() {
}

function stopLyricsTimer() {
}

function restartAudio() {
    if (!audioElement) return;
    
    audioElement.currentTime = 0;
    currentTime = 0;
    updateProgress();
    
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
        audioElement.pause();
        isPlaying = false;
        updatePlayerState();
        stopProgressTimer();
        stopLyricsTimer();
    } else {
        if (audioElement.ended) {
            restartAudio();
        } else {
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
}

function stopProgressTimer() {
}

function updateProgress() {
    if (totalTime > 0) {
        const progressPercent = (currentTime / totalTime) * 100;
        progress.style.width = `${Math.min(progressPercent, 100)}%`;
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
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

let isProgressUpdating = false;
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
    } else if (event.data.type === 'EXPORT_WEBM') {
        if (isExporting) {
            return;
        }
        
        const { audioFile, songTitle, artistName, albumArtFile } = event.data;
        
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
});

function updateSongTitle(title) {
    const songTitleElement = document.querySelector('.vinyl-song-title');
    if (songTitleElement) {
        songTitleElement.textContent = title || '';
    }
    updateVisualizerPosition();
}

function updateArtistName(artist) {
    const artistNameElement = document.querySelector('.vinyl-artist-name');
    if (artistNameElement) {
        artistNameElement.textContent = artist || '';
    }
    updateVisualizerPosition();
}

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
            updateVisualizerPosition();
        }
    } else {
        lyricsText.textContent = '';
        updateVisualizerPosition();
    }
}

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
            bottomValue = '136px';
        } else if (hasTitle || hasArtist) {
            bottomValue = '128px';
        } else {
            bottomValue = '88px';
        }
        
        visualizer.style.bottom = bottomValue;
    }
}

function updateAlbumArt(imageUrl) {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer && imageUrl) {
        musicPlayer.style.backgroundImage = `url(${imageUrl})`;
        musicPlayer.style.backgroundSize = 'cover';
        musicPlayer.style.backgroundPosition = 'center';
        musicPlayer.style.backgroundRepeat = 'no-repeat';
        musicPlayer.style.position = 'relative';
        
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
        albumArt.style.backgroundImage = `url(${imageUrl})`;
        albumArt.style.backgroundSize = 'cover';
        albumArt.style.backgroundPosition = 'center';
        albumArt.style.backgroundRepeat = 'no-repeat';
        albumArt.style.borderRadius = '50%';
        albumArt.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
    }
}

function removeAlbumArt() {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    
    if (musicPlayer) {
        musicPlayer.style.backgroundImage = '';
        musicPlayer.style.backgroundSize = '';
        musicPlayer.style.backgroundPosition = '';
        musicPlayer.style.backgroundRepeat = '';
        
        const overlay = musicPlayer.querySelector('.album-overlay');
        if (overlay) {
            overlay.remove();
        }
        
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
        albumArt.style.backgroundImage = '';
        albumArt.style.backgroundSize = '';
        albumArt.style.backgroundPosition = '';
        albumArt.style.backgroundRepeat = '';
        albumArt.style.borderRadius = '';
        albumArt.style.boxShadow = '';
    }
}

function startPlaying(data) {
    audioElement = new Audio(data.audioUrl);
    
    if (data.songTitle !== undefined) {
        updateSongTitle(data.songTitle);
    }
    if (data.artistName !== undefined) {
        updateArtistName(data.artistName);
    }
    
    if (data.albumArtUrl) {
        updateAlbumArt(data.albumArtUrl);
    }
    
    updateVisualizerPosition();
    enableControls();
    
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
            stopProgressTimer();
            stopLyricsTimer();
            updateTonearm();
            currentTime = 0;
            updateProgress();
        }
    });
    
    audioElement.play().then(() => {
        isPlaying = true;
        updatePlayerState();
        startProgressTimer();
        startLyricsTimer();
    });
    
    updateLyrics();
}

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
    
    updateLyrics();
}

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

// Listen for lyrics color updates from settings
window.addEventListener('message', function(event) {
    if (event.data.type === 'UPDATE_LYRICS_COLOR') {
        lyricsText.style.color = event.data.color;
    }
});

init();
