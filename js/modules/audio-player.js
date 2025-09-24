class AudioPlayer extends BaseModule {
    constructor() {
        super('AudioPlayer');
        this.audioElement = null;
    }
    
    async customInitialize(options = {}) {
        this.audioElement = new Audio();
        this.setupAudioEventListeners();
        this.appState.set('audio.element', this.audioElement);
    }
    
    setupElements() {
        this.attachControlListeners();
    }
    
    attachControlListeners() {
        const playPauseBtn = DOMHelper.getElement('.vinyl-play-pause-btn');
        const muteBtn = DOMHelper.getElement('.vinyl-mute-btn');
        const repeatBtn = DOMHelper.getElement('.vinyl-repeat-btn');
        const progressBar = DOMHelper.getElement('.vinyl-progress-bar');
        
        DOMHelper.addEventListener(playPauseBtn, 'click', () => this.togglePlayPause());
        DOMHelper.addEventListener(muteBtn, 'click', () => this.toggleMute());
        DOMHelper.addEventListener(repeatBtn, 'click', () => this.toggleRepeat());
        
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
        const muteBtn = DOMHelper.getElementSilent('.vinyl-mute-btn');
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
        const repeatBtn = DOMHelper.getElementSilent('.vinyl-repeat-btn');
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
        const controls = DOMHelper.getElements('.control-btn');
        const muteBtn = DOMHelper.getElementSilent('.vinyl-mute-btn');
        const repeatBtn = DOMHelper.getElementSilent('.vinyl-repeat-btn');
        
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
        return ColorHelper.getPlayerColor(colorKey);
    }
    
    updatePlayerState() {
        const vinylAlbumArt = DOMHelper.getElement('.vinyl-album-art');
        const playPauseBtn = DOMHelper.getElement('.vinyl-play-pause-btn');
        const isPlaying = this.appState.get('audio.isPlaying');
        
        if (vinylAlbumArt && playPauseBtn) {
            if (isPlaying) {
                DOMHelper.setStyles(vinylAlbumArt, {
                    animation: 'spin 12s linear infinite',
                    animationPlayState: 'running'
                });
                DOMHelper.setInnerHTML(playPauseBtn, '<i class="fas fa-pause"></i>');
            } else {
                DOMHelper.setStyles(vinylAlbumArt, {
                    animationPlayState: 'paused'
                });
                DOMHelper.setInnerHTML(playPauseBtn, '<i class="fas fa-play"></i>');
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
    
    customDestroy() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.src = '';
            this.audioElement = null;
        }
        
        this.appState.set('audio.element', null);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioPlayer;
}

window.AudioPlayer = AudioPlayer;
