class VinylMusicPlayerApp {
    constructor() {
        this.modules = {};
        this.isInitialized = false;
        
        // Core systems
        this.appState = window.appState;
        this.eventBus = window.eventBus;
        this.logger = window.logger?.module('VinylMusicPlayerApp') || console;
        this.errorHandler = window.errorHandler;
        this.constants = window.Constants;
        
        // Initialize app
        this.initialize();
    }
    
    async initialize() {
        try {
            this.logger.debug('Initializing Vinyl Music Player...');
            
            // Initialize core modules
            await this.initializeModules();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            
            this.isInitialized = true;
            
            this.logger.debug('Vinyl Music Player initialization complete');
            this.eventBus.emit('app:initialized');
            
        } catch (error) {
            this.errorHandler.handleError('App Initialization', error);
        }
    }
    
    async initializeModules() {
        // Initialize Audio Player
        if (window.AudioPlayer) {
            this.modules.audioPlayer = new window.AudioPlayer();
            await this.modules.audioPlayer.initialize();
        }
        
        // Initialize Lyrics Manager
        if (window.LyricsManager) {
            this.modules.lyricsManager = new window.LyricsManager();
        }
        
        // Initialize Vinyl Renderer
        if (window.VinylRenderer) {
            this.modules.vinylRenderer = new window.VinylRenderer();
        }
        
        // Initialize Export Manager
        if (window.ExportManager) {
            this.modules.exportManager = new window.ExportManager();
        }
        
        // Initialize Lyrics Color Manager
        if (window.LyricsColorManager) {
            this.modules.lyricsColorManager = new window.LyricsColorManager();
            window.lyricsColorManager = this.modules.lyricsColorManager; // Set global reference
        }
        
        // Initialize Settings Manager
        if (window.SettingsManager) {
            this.modules.settingsManager = new window.SettingsManager();
            window.settingsManager = this.modules.settingsManager; // Set global reference
        }
        
        // Initialize Toast Manager
        if (window.toastManager) {
            this.modules.toastManager = window.toastManager;
        }
        
        this.logger.debug('All modules initialized successfully');
    }
    
    setupGlobalEventListeners() {
        // Handle window messages for iframe communication
        window.addEventListener('message', (event) => {
            this.handleWindowMessage(event);
        });
        
        // Handle app state changes
        this.appState.subscribe('*', (path, value, newState, oldState) => {
            this.handleStateChange(path, value, newState, oldState);
        });
        
        // Handle UI updates
        this.eventBus.on('ui:updateSongInfo', (data) => {
            this.handleWindowMessage({ data });
        });
        
        // Handle module errors
        this.eventBus.on('*:error', (data) => {
            this.handleModuleError(data);
        });
        
        this.logger.debug('Global event listeners setup complete');
    }
    
    
    handleWindowMessage(event) {
        const { type, ...data } = event.data;
        
        switch (type) {
            case 'START_PLAY':
                this.handleStartPlay(data);
                break;
                
            case 'UPDATE_SONG_TITLE':
                this.handleUpdateSongTitle(data);
                break;
                
            case 'UPDATE_ARTIST_NAME':
                this.handleUpdateArtistName(data);
                break;
                
            case 'UPDATE_ALBUM_ART':
                this.handleUpdateAlbumArt(data);
                break;
                
            case 'REMOVE_ALBUM_ART':
                this.handleRemoveAlbumArt();
                break;
                
            case 'UPDATE_LYRICS':
                this.handleUpdateLyrics(data);
                break;
                
            case 'UPDATE_LYRICS_COLOR':
                this.handleUpdateLyricsColor(data);
                break;
                
            case 'EXPORT_WEBM':
                this.handleExportWebM(data);
                break;
                
            case 'DEBUG_BROWSER_SUPPORT':
                this.handleDebugBrowserSupport();
                break;
                
            default:
                this.logger.warn('Unknown message type:', type);
        }
    }
    
    handleStartPlay(data) {
        if (this.modules.audioPlayer) {
            this.modules.audioPlayer.loadAudio(data).then(() => {
                this.modules.audioPlayer.play();
            });
        }
    }
    
    handleUpdateSongTitle(data) {
        this.appState.set('ui.songTitle', data.songTitle || '');
    }
    
    handleUpdateArtistName(data) {
        this.appState.set('ui.artistName', data.artistName || '');
    }
    
    handleUpdateAlbumArt(data) {
        this.appState.set('ui.albumArt', data.imageUrl);
        if (this.modules.vinylRenderer) {
            this.modules.vinylRenderer.updateAlbumArt(data.imageUrl);
        }
    }
    
    handleRemoveAlbumArt() {
        this.appState.set('ui.albumArt', null);
        if (this.modules.vinylRenderer) {
            this.modules.vinylRenderer.removeAlbumArt();
        }
    }
    
    handleUpdateLyrics(data) {
        if (this.modules.lyricsManager) {
            this.modules.lyricsManager.loadLyrics(data.lyrics);
        }
    }
    
    handleUpdateLyricsColor(data) {
        if (this.modules.lyricsManager) {
            this.modules.lyricsManager.setLyricsColor(data.color);
        }
    }
    
    handleExportWebM(data) {
        if (this.modules.exportManager) {
            this.modules.exportManager.startExport(data);
        }
    }
    
    handleDebugBrowserSupport() {
        this.eventBus.emit('debug:checkSupport');
    }
    
    handleStateChange(path, value, newState, oldState) {
        // Log significant state changes in development (exclude frequent updates)
        if (window.location.hostname === 'localhost' && !path.includes('currentTime')) {
            this.logger.debug(`State changed: ${path}`, value);
        }
        
        // Handle specific state changes
        switch (path) {
            case 'audio.isPlaying':
                if (this.modules.vinylRenderer) {
                    if (value) {
                        this.modules.vinylRenderer.startAnimation();
                    } else {
                        this.modules.vinylRenderer.stopAnimation();
                    }
                }
                break;
                
            case 'audio.currentTime':
            case 'audio.totalTime':
                this.updateProgressDisplay();
                break;
                
            case 'ui.songTitle':
            case 'ui.artistName':
                this.updateSongInfoInUI();
                break;
        }
    }
    
    updateSongInfoInUI() {
        const songTitle = this.appState.get('ui.songTitle');
        const artistName = this.appState.get('ui.artistName');
        
        const songTitleElement = document.querySelector('.song-title');
        const artistNameElement = document.querySelector('.artist-name');
        
        if (songTitleElement) {
            songTitleElement.textContent = songTitle || '';
        }
        
        if (artistNameElement) {
            artistNameElement.textContent = artistName || '';
        }
    }
    
    updateProgressDisplay() {
        const currentTime = this.appState.get('audio.currentTime');
        const totalTime = this.appState.get('audio.totalTime');
        
        const progress = document.querySelector('.vinyl-progress');
        const currentTimeEl = document.querySelector('.vinyl-current-time');
        const totalTimeEl = document.querySelector('.vinyl-total-time');
        
        if (progress && totalTime > 0) {
            const progressPercent = (currentTime / totalTime) * (this.constants?.UI.PROGRESS_MAX || 100);
            progress.style.width = `${Math.min(progressPercent, this.constants?.UI.PROGRESS_MAX || 100)}%`;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(currentTime);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = this.formatTime(totalTime);
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    handleModuleError(data) {
        this.logger.error('Module error occurred', data);
        
        // Show error toast
        if (this.modules.toastManager) {
            this.modules.toastManager.showError('Error', data.error || 'An error occurred');
        } else if (window.toastManager) {
            window.toastManager.showError('Error', data.error || 'An error occurred');
        }
    }
    
    forwardMessageToParent(type, data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type, ...data }, '*');
        }
    }
    
    
    destroy() {
        // Destroy all modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        // Clear modules
        this.modules = {};
        
        // Reset state
        this.appState.reset();
        
        this.isInitialized = false;
        
        this.logger.debug('Application destroyed');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.vinylMusicPlayerApp = new VinylMusicPlayerApp();
    }, window.Constants?.TIME.INIT_DELAY || 100);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VinylMusicPlayerApp;
}
