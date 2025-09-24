class VinylRenderer extends BaseModule {
    constructor() {
        super('VinylRenderer');
        this.vinylElement = null;
        this.tonearmElement = null;
        this.albumArtElement = null;
        this.musicPlayerElement = null;
        
        this.animationId = null;
        this.rotation = 0;
        this.isAnimating = false;
    }
    
    setupElements() {
        this.vinylElement = DOMHelper.getElement('.vinyl-album-art');
        this.tonearmElement = null; // No tonearm in new design
        this.albumArtElement = DOMHelper.getElement('.vinyl-album-art');
        this.musicPlayerElement = DOMHelper.getElement('.music-player');
        
        if (!this.vinylElement) {
            this.logger.warn('Vinyl album art element not found');
        }
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.appState.set('vinyl.isAnimating', true);
        
        if (this.vinylElement) {
            DOMHelper.setStyles(this.vinylElement, {
                animation: 'spin 12s linear infinite',
                animationPlayState: 'running'
            });
        }
    }
    
    stopAnimation() {
        if (!this.isAnimating) return;
        
        this.isAnimating = false;
        this.appState.set('vinyl.isAnimating', false);
        
        if (this.vinylElement) {
            DOMHelper.setStyles(this.vinylElement, {
                animationPlayState: 'paused'
            });
        }
    }
    
    updateAlbumArt(imageUrl) {
        if (!imageUrl) {
            this.removeAlbumArt();
            return;
        }
        
        // Only update vinyl album art (the circular disc)
        if (this.albumArtElement) {
            DOMHelper.setStyles(this.albumArtElement, {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '50%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
            });
        }
        
        this.eventBus.emit('vinyl:albumArtUpdated', { imageUrl });
    }
    
    removeAlbumArt() {
        // Only remove vinyl album art (the circular disc)
        if (this.albumArtElement) {
            DOMHelper.setStyles(this.albumArtElement, {
                backgroundImage: '',
                backgroundSize: '',
                backgroundPosition: '',
                backgroundRepeat: '',
                borderRadius: '',
                boxShadow: ''
            });
        }
        
        this.eventBus.emit('vinyl:albumArtRemoved');
    }
    
    
    
    setupEventListeners() {
        // Animation is controlled by AppState changes, not direct audio events
        
        // Listen for album art updates
        this.eventBus.on('vinyl:updateAlbumArt', (data) => {
            this.updateAlbumArt(data.imageUrl);
        });
        
        this.eventBus.on('vinyl:removeAlbumArt', () => {
            this.removeAlbumArt();
        });
        
        // Listen for animation updates
        this.eventBus.on('vinyl:updateAnimation', (data) => {
            if (data.isPlaying) {
                this.startAnimation();
            } else {
                this.stopAnimation();
            }
        });
        
        // Listen for state changes
        this.appState.subscribe('ui.albumArt', (value) => {
            this.updateAlbumArt(value);
        });
        
        this.appState.subscribe('audio.isPlaying', (value) => {
            if (value) {
                this.startAnimation();
            } else {
                this.stopAnimation();
            }
        });
    }
    
    
    customDestroy() {
        this.stopAnimation();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.removeAlbumArt();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VinylRenderer;
}

window.VinylRenderer = VinylRenderer;
