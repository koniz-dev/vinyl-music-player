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
const progressBar = document.querySelector('.vinyl-progress-bar');
const lyricsText = document.querySelector('.vinyl-lyrics-text');
const muteBtn = document.querySelector('.vinyl-mute-btn');
const repeatBtn = document.querySelector('.vinyl-repeat-btn');

function init() {
    updateProgress();
    updateTonearm();
    updateLyrics();
}

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

function restartAudio() {
    if (!audioElement) return;

    audioElement.currentTime = 0;
    currentTime = 0;
    updateProgress();

    setTimeout(() => {
        audioElement.play().then(() => {
            isPlaying = true;
            updatePlayerState();
        }).catch(() => {
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
        return;
    }

    if (audioElement.ended) {
        restartAudio();
        return;
    }

    audioElement.play().then(() => {
        isPlaying = true;
        updatePlayerState();
    }).catch(() => {
        isPlaying = false;
        updatePlayerState();
    });
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
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
        case 'START_PLAY':
            startPlaying(data);
            break;
        case 'UPDATE_SONG_TITLE':
            updateSongTitle(data.songTitle);
            break;
        case 'UPDATE_ARTIST_NAME':
            updateArtistName(data.artistName);
            break;
        case 'UPDATE_ALBUM_ART':
            updateAlbumArt(data.imageUrl);
            break;
        case 'REMOVE_ALBUM_ART':
            removeAlbumArt();
            break;
        case 'UPDATE_LYRICS':
            updateLyricsFromSettings(data.lyrics);
            break;
        case 'UPDATE_LYRICS_COLOR':
            lyricsText.style.color = data.color;
            break;
        case 'DEBUG_BROWSER_SUPPORT':
            debugBrowserSupport();
            break;
        case 'EXPORT_WEBM': {
            if (isExporting) return;

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
            break;
        }
    }
});

function updateSongTitle(title) {
    const songTitleElement = document.querySelector('.vinyl-song-title');
    if (songTitleElement) {
        songTitleElement.textContent = title || '';
    }
}

function updateArtistName(artist) {
    const artistNameElement = document.querySelector('.vinyl-artist-name');
    if (artistNameElement) {
        artistNameElement.textContent = artist || '';
    }
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
        }
    } else {
        lyricsText.textContent = '';
    }
}


function updateAlbumArt(imageUrl) {
    if (!imageUrl) return;

    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    // imageUrl is a blob: URL from createObjectURL — safe to embed, but
    // escape backslashes/quotes defensively in case the source ever changes.
    const safeUrl = String(imageUrl).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const bg = `url("${safeUrl}")`;

    if (musicPlayer) {
        musicPlayer.classList.add('has-album-art');
        musicPlayer.style.backgroundImage = bg;
    }

    if (albumArt) {
        albumArt.style.backgroundImage = bg;
    }
}

function removeAlbumArt() {
    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');

    if (musicPlayer) {
        musicPlayer.classList.remove('has-album-art');
        musicPlayer.style.backgroundImage = '';
    }

    if (albumArt) {
        albumArt.style.backgroundImage = '';
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
            return;
        }
        isPlaying = false;
        updatePlayerState();
        updateTonearm();
        currentTime = 0;
        updateProgress();
    });

    audioElement.play().then(() => {
        isPlaying = true;
        updatePlayerState();
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

init();
