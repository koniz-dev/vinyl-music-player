class AudioPlayer {
    constructor() {
        this.audioElement = null;
        this.isInitialized = false;
        this.eventBus = window.eventBus;
        this.appState = window.appState;
        this.logger = window.logger?.module('AudioPlayer') || console;
        this.errorHandler = window.errorHandler;
        this.constants = window.Constants;
        
        this.setupEventListeners();
        this.setupDOMEventListeners();
    }
    
    async initialize(options = {}) {
        try {
            this.logger.debug('Initializing AudioPlayer');
            this.audioElement = new Audio();
            this.setupAudioEventListeners();
            
            this.appState.set('audio.element', this.audioElement);
            this.isInitialized = true;
            
            this.logger.debug('AudioPlayer initialized successfully');
            
        } catch (error) {
            this.errorHandler.handleAudioError(error, 'AudioPlayer initialization');
            throw error;
        }
    }
    
    setupDOMEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.attachControlListeners();
            });
        } else {
            this.attachControlListeners();
        }
    }
    
    attachControlListeners() {
        const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
        const muteBtn = document.querySelector('.vinyl-mute-btn');
        const repeatBtn = document.querySelector('.vinyl-repeat-btn');
        const progressBar = document.querySelector('.vinyl-progress-bar');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }
        
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => {
                this.toggleRepeat();
            });
        }
        
        if (progressBar) {
            this.setupProgressBarClick(progressBar);
        }
    }
    
    setupProgressBarClick(progressBar) {
        let isProgressUpdating = false;
        
        progressBar.addEventListener('click', (e) => {
            if (isProgressUpdating || !this.audioElement) return;
            isProgressUpdating = true;
            
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const totalTime = this.appState.get('audio.totalTime');
            const newTime = Math.floor(percent * totalTime);
            
            this.seekTo(newTime);
            
            setTimeout(() => {
                isProgressUpdating = false;
            }, this.constants?.ANIMATION.TIMEOUT_DELAY || 100);
        });
    }
    
    async loadAudio(audioData) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            const { audioUrl, songTitle, artistName, albumArtUrl } = audioData;
            
            // Update UI state
            this.appState.batchUpdate({
                'ui.songTitle': songTitle || '',
                'ui.artistName': artistName || '',
                'ui.albumArt': albumArtUrl || null
            });
            
            // Load audio
            this.audioElement.src = audioUrl;
            await this.waitForAudioLoad();
            
            // Enable controls after audio is loaded
            this.enableControls();
            
            this.eventBus.emit('audio:loaded', {
                duration: this.audioElement.duration,
                title: songTitle,
                artist: artistName
            });
            
        } catch (error) {
            this.eventBus.emit('audio:error', { error: error.message });
            throw error;
        }
    }
    
    async play() {
        if (!this.audioElement) {
            const error = new Error('Audio not loaded');
            this.errorHandler.handleAudioError(error, 'AudioPlayer play');
            throw error;
        }
        
        try {
            this.logger.debug('Starting audio playback');
            await this.audioElement.play();
            this.appState.set('audio.isPlaying', true);
            this.updatePlayerState();
            this.eventBus.emit('audio:play');
            this.logger.debug('Audio playback started');
            
        } catch (error) {
            this.appState.set('audio.isPlaying', false);
            this.updatePlayerState();
            this.errorHandler.handleAudioError(error, 'AudioPlayer play');
            throw error;
        }
    }
    
    pause() {
        if (!this.audioElement) return;
        
        this.audioElement.pause();
        this.appState.set('audio.isPlaying', false);
        this.updatePlayerState();
        this.eventBus.emit('audio:pause');
    }
    
    async togglePlayPause() {
        const isPlaying = this.appState.get('audio.isPlaying');
        
        if (isPlaying) {
            this.pause();
        } else {
            if (this.audioElement && this.audioElement.ended) {
                await this.restartAudio();
            } else {
                await this.play();
            }
        }
    }
    
    
    async restartAudio() {
        if (!this.audioElement) return;
        
        this.audioElement.currentTime = 0;
        this.appState.set('audio.currentTime', 0);
        
        setTimeout(async () => {
            try {
                await this.audioElement.play();
                this.appState.set('audio.isPlaying', true);
                this.updatePlayerState();
                this.eventBus.emit('audio:play');
            } catch (error) {
                this.appState.set('audio.isPlaying', false);
                this.updatePlayerState();
                this.eventBus.emit('audio:error', { error: error.message });
            }
        }, this.constants?.ANIMATION.TIMEOUT_DELAY || 100);
    }
    
    seekTo(time) {
        if (!this.audioElement) return;
        
        const duration = this.audioElement.duration;
        const clampedTime = Math.max(0, Math.min(time, duration));
        
        this.audioElement.currentTime = clampedTime;
        this.appState.set('audio.currentTime', clampedTime);
        this.eventBus.emit('audio:seek', { time: clampedTime });
    }
    
    
    toggleMute() {
        if (!this.audioElement) return;
        
        const isMuted = this.appState.get('audio.isMuted');
        this.audioElement.muted = !isMuted;
        this.appState.set('audio.isMuted', !isMuted);
        
        // Update mute button UI
        const muteBtn = document.querySelector('.vinyl-mute-btn');
        if (muteBtn) {
            if (!isMuted) {
                // Mute is being activated
                muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                muteBtn.style.background = this.getPlayerColor('accent');
                muteBtn.style.color = this.getPlayerColor('primary');
            } else {
                // Mute is being deactivated
                muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                muteBtn.style.background = 'transparent';
                muteBtn.style.color = this.getPlayerColor('strong');
            }
        }
        
        this.eventBus.emit('audio:muteToggle', { isMuted: !isMuted });
    }
    
    toggleRepeat() {
        const isRepeat = this.appState.get('audio.isRepeat');
        this.appState.set('audio.isRepeat', !isRepeat);
        
        // Update repeat button UI
        const repeatBtn = document.querySelector('.vinyl-repeat-btn');
        if (repeatBtn) {
            if (!isRepeat) {
                // Activate repeat mode
                repeatBtn.style.background = this.getPlayerColor('accent');
                repeatBtn.style.color = this.getPlayerColor('primary');
            } else {
                // Deactivate repeat mode - return to default style
                repeatBtn.style.background = 'transparent';
                repeatBtn.style.color = this.getPlayerColor('strong');
            }
        }
        
        this.eventBus.emit('audio:repeatToggle', { isRepeat: !isRepeat });
    }
    
    enableControls() {
        const controls = document.querySelectorAll('.control-btn');
        const muteBtn = document.querySelector('.vinyl-mute-btn');
        const repeatBtn = document.querySelector('.vinyl-repeat-btn');
        
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        if (muteBtn) {
            muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            muteBtn.style.background = 'transparent';
            muteBtn.style.color = this.getPlayerColor('strong');
        }
        
        if (repeatBtn) {
            repeatBtn.style.background = 'transparent';
            repeatBtn.style.color = this.getPlayerColor('strong');
        }
        
        this.appState.set('audio.isRepeat', false);
    }
    
    getPlayerColor(colorKey) {
        // Get color from CSS custom properties or calculate from base color
        const root = document.documentElement;
        const cssColor = getComputedStyle(root).getPropertyValue(`--player-${colorKey}`).trim();
        
        if (cssColor) {
            return cssColor;
        }
        
        // Fallback: calculate from base color
        const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
        const colorMap = {
            base: window.Constants.PLAYER_BASE_COLOR,
            light: this.addRgb(baseRgb, 17, 16, 20),
            lighter: this.addRgb(baseRgb, 16, 16, 16),
            neutral: this.addRgb(baseRgb, -4, -8, -9),
            muted: this.addRgb(baseRgb, -27, -27, -27),
            subtle: this.addRgb(baseRgb, -24, -24, -24),
            medium: this.addRgb(baseRgb, -82, -92, -103),
            strong: this.addRgb(baseRgb, -80, -80, -80),
            dark: this.addRgb(baseRgb, -93, -96, -95),
            darker: this.addRgb(baseRgb, -78, -79, -57),
            accent: this.addRgb(baseRgb, -16, -74, -118),
            primary: this.addRgb(baseRgb, -61, -120, -150)
        };
        
        return colorMap[colorKey] || window.Constants.PLAYER_BASE_COLOR;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    addRgb(rgb, rOffset, gOffset, bOffset) {
        const newR = Math.max(0, Math.min(255, rgb.r + rOffset));
        const newG = Math.max(0, Math.min(255, rgb.g + gOffset));
        const newB = Math.max(0, Math.min(255, rgb.b + bOffset));
        return this.rgbToHex(newR, newG, newB);
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    updatePlayerState() {
        const vinylAlbumArt = document.querySelector('.vinyl-album-art');
        const playPauseBtn = document.querySelector('.vinyl-play-pause-btn');
        const isPlaying = this.appState.get('audio.isPlaying');
        
        if (vinylAlbumArt && playPauseBtn) {
            if (isPlaying) {
                vinylAlbumArt.style.animation = 'spin 12s linear infinite';
                vinylAlbumArt.style.animationPlayState = 'running';
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                vinylAlbumArt.style.animationPlayState = 'paused';
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    }
    
    
    setupAudioEventListeners() {
        if (!this.audioElement) return;
        
        this.audioElement.addEventListener('loadedmetadata', () => {
            const duration = this.audioElement.duration;
            this.appState.set('audio.totalTime', duration);
            this.eventBus.emit('audio:metadataLoaded', { duration });
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            const currentTime = this.audioElement.currentTime;
            this.appState.set('audio.currentTime', currentTime);
            this.eventBus.emit('audio:timeUpdate', { currentTime });
        });
        
        this.audioElement.addEventListener('ended', () => {
            const isRepeat = this.appState.get('audio.isRepeat');
            
            if (isRepeat) {
                this.audioElement.currentTime = 0;
                this.play();
            } else {
                this.appState.set('audio.isPlaying', false);
                this.appState.set('audio.currentTime', 0);
                this.updatePlayerState();
                this.eventBus.emit('audio:ended');
            }
        });
        
        this.audioElement.addEventListener('error', (e) => {
            this.eventBus.emit('audio:error', { 
                error: 'Audio playback error',
                details: e
            });
        });
        
        this.audioElement.addEventListener('canplay', () => {
            this.eventBus.emit('audio:canPlay');
        });
        
        this.audioElement.addEventListener('waiting', () => {
            this.eventBus.emit('audio:waiting');
        });
        
        this.audioElement.addEventListener('playing', () => {
            this.eventBus.emit('audio:playing');
        });
    }
    
    setupEventListeners() {
        // Listen for external play requests
        this.eventBus.on('audio:requestPlay', (data) => {
            this.loadAudio(data).then(() => this.play());
        });
        
        // Listen for control requests
        this.eventBus.on('audio:requestPause', () => this.pause());
        this.eventBus.on('audio:requestToggle', () => this.togglePlayPause());
        this.eventBus.on('audio:requestSeek', (data) => this.seekTo(data.time));
        this.eventBus.on('audio:requestMute', () => this.toggleMute());
        this.eventBus.on('audio:requestRepeat', () => this.toggleRepeat());
        this.eventBus.on('audio:requestUpdateUI', () => this.updatePlayerState());
    }
    
    waitForAudioLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const error = new Error('Audio loading timeout');
                this.errorHandler.handleAudioError(error, 'AudioPlayer waitForAudioLoad');
                reject(error);
            }, this.constants?.AUDIO.LOADING_TIMEOUT || 10000);
            
            const onLoadedMetadata = () => {
                clearTimeout(timeout);
                this.audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.audioElement.removeEventListener('error', onError);
                this.logger.debug('Audio metadata loaded successfully');
                resolve();
            };
            
            const onError = (e) => {
                clearTimeout(timeout);
                this.audioElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                this.audioElement.removeEventListener('error', onError);
                const error = new Error('Failed to load audio');
                this.errorHandler.handleAudioError(error, 'AudioPlayer waitForAudioLoad');
                reject(error);
            };
            
            this.audioElement.addEventListener('loadedmetadata', onLoadedMetadata);
            this.audioElement.addEventListener('error', onError);
        });
    }
    
    destroy() {
        this.logger.debug('Destroying AudioPlayer');
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
        }
        
        this.appState.set('audio.element', null);
        this.isInitialized = false;
        
        this.eventBus.emit('audio:destroyed');
        this.logger.debug('AudioPlayer destroyed');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioPlayer;
}

window.AudioPlayer = AudioPlayer;
