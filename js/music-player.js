/**
 * Vinyl Music Player Module
 * Handles audio playback, lyrics display, and vinyl animations
 */
export class VinylMusicPlayer {
    constructor() {
        // Player State Variables
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalTime = 0;
        this.audioElement = null;
        this.isMuted = false;
        this.isRepeat = false;
        this.isExporting = false;

        // Lyrics Data
        this.lyrics = [];

        // DOM Elements
        this.vinyl = document.getElementById('vinyl');
        this.tonearm = document.getElementById('tonearm');
        this.playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
        this.progress = document.querySelector('.vinyl-progress');
        this.currentTimeEl = document.querySelector('.vinyl-current-time');
        this.progressBar = document.querySelector('.vinyl-progress-bar');
        this.lyricsText = document.querySelector('.vinyl-lyrics-text');
        this.muteBtn = document.querySelector('.vinyl-mute-btn');
        this.repeatBtn = document.querySelector('.vinyl-repeat-btn');

        this.init();
    }

    /**
     * Initialize the music player
     */
    init() {
        this.updateProgress();
        this.updateTonearm();
        this.updateLyrics();
        // Set default lyrics color
        this.lyricsText.style.color = '#ffb3d1';
        this.setupEventListeners();
        this.setupMessageHandler();
    }

    /**
     * Update lyrics display based on current time
     */
    updateLyrics() {
        if (!this.audioElement || !this.isPlaying) {
            this.lyricsText.textContent = '';
            return;
        }

        const currentLyric = this.getCurrentLyric(this.currentTime);
        
        if (currentLyric) {
            if (currentLyric.text !== this.lyricsText.textContent) {
                this.lyricsText.style.opacity = '0.5';
                setTimeout(() => {
                    this.lyricsText.textContent = currentLyric.text;
                    this.lyricsText.style.opacity = '1';
                }, 150);
            }
        } else {
            if (this.lyricsText.textContent !== '') {
                this.lyricsText.textContent = '';
            }
        }
    }

    /**
     * Get the current lyric based on time
     * @param {number} time - Current time in seconds
     * @returns {Object|null} Current lyric object or null
     */
    getCurrentLyric(time) {
        if (!this.lyrics || this.lyrics.length === 0) {
            return null;
        }
        
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i] && typeof this.lyrics[i].start !== 'undefined' && typeof this.lyrics[i].end !== 'undefined') {
                if (time >= this.lyrics[i].start && time < this.lyrics[i].end) {
                    return this.lyrics[i];
                }
            }
        }
        
        return null;
    }


    /**
     * Restart audio from the beginning
     */
    restartAudio() {
        if (!this.audioElement) return;
        
        this.audioElement.currentTime = 0;
        this.currentTime = 0;
        this.updateProgress();
        
        setTimeout(() => {
            this.audioElement.play().then(() => {
                this.isPlaying = true;
                this.updatePlayerState();
            }).catch(error => {
                this.isPlaying = false;
                this.updatePlayerState();
            });
        }, 100);
    }

    /**
     * Toggle play/pause state
     */
    togglePlayPause() {
        if (!this.audioElement) return;
        
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            this.updatePlayerState();
        } else {
            if (this.audioElement.ended) {
                this.restartAudio();
            } else {
                this.audioElement.play().then(() => {
                    this.isPlaying = true;
                    this.updatePlayerState();
                }).catch(error => {
                    this.isPlaying = false;
                    this.updatePlayerState();
                });
            }
        }
    }


    /**
     * Update progress bar and time display
     */
    updateProgress() {
        if (this.totalTime > 0) {
            const progressPercent = (this.currentTime / this.totalTime) * 100;
            this.progress.style.width = `${Math.min(progressPercent, 100)}%`;
        }
        this.currentTimeEl.textContent = this.formatTime(this.currentTime);
    }

    /**
     * Update tonearm animation state
     */
    updateTonearm() {
        if (this.isPlaying) {
            this.tonearm.classList.add('playing');
        } else {
            this.tonearm.classList.remove('playing');
        }
    }

    /**
     * Format time in seconds to mm:ss format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Progress Bar Click Handler
        this.isProgressUpdating = false;
        
        this.progressBar.addEventListener('click', (e) => {
            if (this.isProgressUpdating || !this.audioElement) return;
            this.isProgressUpdating = true;
            
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = Math.floor(percent * this.totalTime);
            
            this.currentTime = newTime;
            this.audioElement.currentTime = newTime;
            this.updateProgress();
            
            setTimeout(() => {
                this.isProgressUpdating = false;
            }, 100);
        });

        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });

        // Mute button
        this.muteBtn.addEventListener('click', () => {
            if (!this.audioElement) return;
            
            this.isMuted = !this.isMuted;
            this.audioElement.muted = this.isMuted;
            
            if (this.isMuted) {
                this.muteBtn.textContent = '🔇';
                this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            } else {
                this.muteBtn.textContent = '🔊';
                this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        });

        // Repeat button
        this.repeatBtn.addEventListener('click', () => {
            if (!this.audioElement) return;
            
            this.isRepeat = !this.isRepeat;
            
            if (this.isRepeat) {
                this.repeatBtn.style.background = 'rgba(102, 126, 234, 0.3)';
                this.repeatBtn.style.color = '#667eea';
            } else {
                this.repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                this.repeatBtn.style.color = 'white';
            }
        });
    }
    /**
     * Message Handler
     * Handles communication with the control panel
     */
    setupMessageHandler() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            const { type } = message;
            
            switch (type) {
                case 'START_PLAY':
                    this.startPlaying(message);
                    break;
                case 'UPDATE_SONG_TITLE':
                    this.updateSongTitle(message.songTitle);
                    break;
                case 'UPDATE_ARTIST_NAME':
                    this.updateArtistName(message.artistName);
                    break;
                case 'UPDATE_ALBUM_ART':
                    this.updateAlbumArt(message.imageUrl);
                    break;
                case 'REMOVE_ALBUM_ART':
                    this.removeAlbumArt();
                    break;
                case 'UPDATE_LYRICS':
                    this.updateLyricsFromSettings(message.lyrics);
                    break;
                case 'UPDATE_LYRICS_COLOR':
                    this.lyricsText.style.color = message.color;
                    break;
                case 'DEBUG_BROWSER_SUPPORT':
                    this.debugBrowserSupport();
                    break;
                case 'EXPORT_WEBM':
                    this.handleExportRequest(message);
                    break;
            }
        });
    }

    /**
     * Handle export request from control panel
     * @param {Object} data - Export data
     */
    handleExportRequest(data) {
        if (this.isExporting) {
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
        
        // Call the video exporter function
        if (window.startVideoRecording) {
            window.startVideoRecording(audioFile, songTitle, artistName, albumArtFile);
        }
    }

    /**
     * Update song title display
     * @param {string} title - The song title
     */
    updateSongTitle(title) {
        const songTitleElement = document.querySelector('.vinyl-song-title');
        if (songTitleElement) {
            songTitleElement.textContent = title || '';
        }
    }

    /**
     * Update artist name display
     * @param {string} artist - The artist name
     */
    updateArtistName(artist) {
        const artistNameElement = document.querySelector('.vinyl-artist-name');
        if (artistNameElement) {
            artistNameElement.textContent = artist || '';
        }
    }

    /**
     * Update lyrics from settings panel
     * @param {Array} newLyrics - Array of lyrics objects
     */
    updateLyricsFromSettings(newLyrics) {
        this.lyrics.length = 0;
        
        if (newLyrics && newLyrics.length > 0) {
            newLyrics.forEach(lyric => {
                if (lyric && 
                    typeof lyric.start !== 'undefined' && 
                    typeof lyric.end !== 'undefined' && 
                    typeof lyric.text !== 'undefined' && 
                    lyric.text.trim() !== '') {
                    this.lyrics.push(lyric);
                }
            });
        }
        
        if (this.audioElement) {
            if (this.isPlaying) {
                this.updateLyrics();
            } else {
                this.lyricsText.textContent = '';
            }
        } else {
            this.lyricsText.textContent = '';
        }
    }


    /**
     * Update album art display
     * @param {string} imageUrl - URL of the album art image
     */
    updateAlbumArt(imageUrl) {
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
    removeAlbumArt() {
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
    startPlaying(data) {
        this.audioElement = new Audio(data.audioUrl);
        
        // Update song information
        if (data.songTitle !== undefined) {
            this.updateSongTitle(data.songTitle);
        }
        if (data.artistName !== undefined) {
            this.updateArtistName(data.artistName);
        }
        
        if (data.albumArtUrl) {
            this.updateAlbumArt(data.albumArtUrl);
        }
        
        this.enableControls();
        
        // Setup audio event listeners
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.totalTime = Math.floor(this.audioElement.duration);
            document.querySelector('.vinyl-total-time').textContent = this.formatTime(this.totalTime);
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            this.currentTime = this.audioElement.currentTime;
            this.updateProgress();
            this.updateLyrics();
        });
        
        this.audioElement.addEventListener('ended', () => {
            if (this.isRepeat) {
                this.audioElement.currentTime = 0;
                this.audioElement.play();
            } else {
                this.isPlaying = false;
                this.updatePlayerState();
                this.updateTonearm();
                this.currentTime = 0;
                this.updateProgress();
            }
        });
        
        // Start playback
        this.audioElement.play().then(() => {
            this.isPlaying = true;
            this.updatePlayerState();
        });
        
        this.updateLyrics();
    }

    /**
     * Enable all control buttons
     */
    enableControls() {
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        this.muteBtn.textContent = '🔊';
        this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        this.repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        this.repeatBtn.style.color = 'white';
        this.isRepeat = false;
    }

    /**
     * Update player state (play/pause, animations)
     */
    updatePlayerState() {
        if (this.isPlaying) {
            this.vinyl.style.animation = 'spin 8s linear infinite';
            this.tonearm.classList.add('playing');
            this.playPauseBtn.textContent = '⏸';
        } else {
            this.vinyl.style.animation = 'none';
            this.tonearm.classList.remove('playing');
            this.playPauseBtn.textContent = '▶';
        }
        
        this.updateLyrics();
    }

    /**
     * Debug browser support
     */
    debugBrowserSupport() {
        const support = {
            mediaRecorder: !!window.MediaRecorder,
            canvas: !!document.createElement('canvas').getContext,
            audio: !!window.Audio,
            webm: MediaRecorder.isTypeSupported('video/webm'),
            webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
            webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
            userAgent: navigator.userAgent
        };
        
        let message = 'Browser Support Check:\n\n';
        message += `MediaRecorder: ${support.mediaRecorder ? '✅' : '❌'}\n`;
        message += `Canvas: ${support.canvas ? '✅' : '❌'}\n`;
        message += `Audio: ${support.audio ? '✅' : '❌'}\n`;
        message += `WebM: ${support.webm ? '✅' : '❌'}\n`;
        message += `WebM VP8: ${support.webm_vp8 ? '✅' : '❌'}\n`;
        message += `WebM VP9: ${support.webm_vp9 ? '✅' : '❌'}\n`;
        message += `Browser: ${navigator.userAgent.split(' ')[0]}`;
        
        alert(message);
    }
}

/**
 * Initialize the music player when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    window.vinylMusicPlayer = new VinylMusicPlayer();
});
