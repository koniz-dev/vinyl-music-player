/**
 * Main Application Entry Point
 * Initializes and coordinates all modules
 */
class VinylMusicPlayerApp {
    constructor() {
        this.modules = {};
        this.isInitialized = false;
        
        // Core systems
        this.appState = window.appState;
        this.eventBus = window.eventBus;
        
        // Initialize app
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('[App] Initializing Vinyl Music Player...');
            
            // Initialize core modules
            await this.initializeModules();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup message handling for iframe communication
            this.setupMessageHandling();
            
            this.isInitialized = true;
            
            console.log('[App] Initialization complete');
            // App initialization complete
            
        } catch (error) {
            console.error('[App] Initialization failed:', error);
            this.eventBus.emit('app:error', { error: error.message });
        }
    }
    
    /**
     * Initialize all modules
     */
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
        
        console.log('[App] All modules initialized');
    }
    
    /**
     * Setup global event listeners
     */
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
        
        console.log('[App] Global event listeners setup complete');
    }
    
    /**
     * Setup message handling for iframe communication
     */
    setupMessageHandling() {
        // Export messages are handled by ExportManager directly
    }
    
    /**
     * Handle window messages from parent frame
     * @param {MessageEvent} event - Message event
     */
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
                console.warn('[App] Unknown message type:', type);
        }
    }
    
    /**
     * Handle start play request
     * @param {Object} data - Play data
     */
    handleStartPlay(data) {
        if (this.modules.audioPlayer) {
            this.modules.audioPlayer.loadAudio(data).then(() => {
                this.modules.audioPlayer.play();
            });
        }
    }
    
    /**
     * Handle song title update
     * @param {Object} data - Title data
     */
    handleUpdateSongTitle(data) {
        this.appState.set('ui.songTitle', data.songTitle || '');
    }
    
    /**
     * Handle artist name update
     * @param {Object} data - Artist data
     */
    handleUpdateArtistName(data) {
        this.appState.set('ui.artistName', data.artistName || '');
    }
    
    /**
     * Handle album art update
     * @param {Object} data - Album art data
     */
    handleUpdateAlbumArt(data) {
        this.appState.set('ui.albumArt', data.imageUrl);
        if (this.modules.vinylRenderer) {
            this.modules.vinylRenderer.updateAlbumArt(data.imageUrl);
        }
    }
    
    /**
     * Handle album art removal
     */
    handleRemoveAlbumArt() {
        this.appState.set('ui.albumArt', null);
        if (this.modules.vinylRenderer) {
            this.modules.vinylRenderer.removeAlbumArt();
        }
    }
    
    /**
     * Handle lyrics update
     * @param {Object} data - Lyrics data
     */
    handleUpdateLyrics(data) {
        if (this.modules.lyricsManager) {
            this.modules.lyricsManager.loadLyrics(data.lyrics);
        }
    }
    
    /**
     * Handle lyrics color update
     * @param {Object} data - Color data
     */
    handleUpdateLyricsColor(data) {
        if (this.modules.lyricsManager) {
            this.modules.lyricsManager.setLyricsColor(data.color);
        }
    }
    
    /**
     * Handle WebM export request
     * @param {Object} data - Export data
     */
    handleExportWebM(data) {
        if (this.modules.exportManager) {
            this.modules.exportManager.startExport(data);
        }
    }
    
    /**
     * Handle debug browser support request
     */
    handleDebugBrowserSupport() {
        this.eventBus.emit('debug:checkSupport');
    }
    
    /**
     * Handle state changes
     * @param {string} path - State path
     * @param {any} value - New value
     * @param {Object} newState - New state
     * @param {Object} oldState - Old state
     */
    handleStateChange(path, value, newState, oldState) {
        // Log significant state changes in development (exclude frequent updates)
        if (window.location.hostname === 'localhost' && !path.includes('currentTime')) {
            console.log(`[App] State changed: ${path}`, value);
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
    
    /**
     * Update song info in UI
     */
    updateSongInfoInUI() {
        const songTitle = this.appState.get('ui.songTitle');
        const artistName = this.appState.get('ui.artistName');
        
        const songTitleElement = document.querySelector('.vinyl-song-title');
        const artistNameElement = document.querySelector('.vinyl-artist-name');
        
        if (songTitleElement) {
            songTitleElement.textContent = songTitle || '';
        }
        
        if (artistNameElement) {
            artistNameElement.textContent = artistName || '';
        }
    }
    
    /**
     * Update progress display
     */
    updateProgressDisplay() {
        const currentTime = this.appState.get('audio.currentTime');
        const totalTime = this.appState.get('audio.totalTime');
        
        const progress = document.querySelector('.vinyl-progress');
        const currentTimeEl = document.querySelector('.vinyl-current-time');
        const totalTimeEl = document.querySelector('.vinyl-total-time');
        
        if (progress && totalTime > 0) {
            const progressPercent = (currentTime / totalTime) * 100;
            progress.style.width = `${Math.min(progressPercent, 100)}%`;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(currentTime);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = this.formatTime(totalTime);
        }
    }
    
    /**
     * Format time for display
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Handle module errors
     * @param {Object} data - Error data
     */
    handleModuleError(data) {
        console.error('[App] Module error:', data);
        
        // Show error toast
        if (this.modules.toastManager) {
            this.modules.toastManager.showError('Error', data.error || 'An error occurred');
        } else if (window.toastManager) {
            window.toastManager.showError('Error', data.error || 'An error occurred');
        }
    }
    
    /**
     * Forward message to parent frame
     * @param {string} type - Message type
     * @param {Object} data - Message data
     */
    forwardMessageToParent(type, data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type, ...data }, '*');
        }
    }
    
    /**
     * Get application status
     * @returns {Object} Application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            modules: Object.keys(this.modules),
            state: this.appState.getSnapshot()
        };
    }
    
    /**
     * Cleanup application
     */
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
        
        console.log('[App] Application destroyed');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for all modules to load
    setTimeout(() => {
        window.vinylMusicPlayerApp = new VinylMusicPlayerApp();
    }, 100);
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VinylMusicPlayerApp;
}
