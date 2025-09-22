class VinylRenderer {
    constructor() {
        this.vinylElement = null;
        this.tonearmElement = null;
        this.albumArtElement = null;
        this.musicPlayerElement = null;
        
        this.animationId = null;
        this.rotation = 0;
        this.isAnimating = false;
        
        this.eventBus = window.eventBus;
        this.appState = window.appState;
        
        this.setupEventListeners();
        this.initializeElements();
    }
    
    initializeElements() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupElements();
            });
        } else {
            this.setupElements();
        }
    }
    
    setupElements() {
        this.vinylElement = document.querySelector('.vinyl-album-art');
        this.tonearmElement = null; // No tonearm in new design
        this.albumArtElement = document.querySelector('.vinyl-album-art');
        this.musicPlayerElement = document.querySelector('.music-player');
        
        if (!this.vinylElement) {
            if (window.logger) {
                window.logger.warn('Vinyl album art element not found');
            } else {
                console.warn('Vinyl album art element not found');
            }
        }
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.appState.set('vinyl.isAnimating', true);
        
        if (this.vinylElement) {
            this.vinylElement.style.animation = 'spin 12s linear infinite';
            this.vinylElement.style.animationPlayState = 'running';
        }
    }
    
    stopAnimation() {
        if (!this.isAnimating) return;
        
        this.isAnimating = false;
        this.appState.set('vinyl.isAnimating', false);
        
        if (this.vinylElement) {
            this.vinylElement.style.animationPlayState = 'paused';
        }
    }
    
    updateAlbumArt(imageUrl) {
        if (!imageUrl) {
            this.removeAlbumArt();
            return;
        }
        
        // Only update vinyl album art (the circular disc)
        if (this.albumArtElement) {
            this.albumArtElement.style.backgroundImage = `url(${imageUrl})`;
            this.albumArtElement.style.backgroundSize = 'cover';
            this.albumArtElement.style.backgroundPosition = 'center';
            this.albumArtElement.style.backgroundRepeat = 'no-repeat';
            this.albumArtElement.style.borderRadius = '50%';
            this.albumArtElement.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
        
        this.eventBus.emit('vinyl:albumArtUpdated', { imageUrl });
    }
    
    removeAlbumArt() {
        // Only remove vinyl album art (the circular disc)
        if (this.albumArtElement) {
            this.albumArtElement.style.backgroundImage = '';
            this.albumArtElement.style.backgroundSize = '';
            this.albumArtElement.style.backgroundPosition = '';
            this.albumArtElement.style.backgroundRepeat = '';
            this.albumArtElement.style.borderRadius = '';
            this.albumArtElement.style.boxShadow = '';
        }
        
        this.eventBus.emit('vinyl:albumArtRemoved');
    }
    
    
    updateRotation(rotation) {
        this.rotation = rotation;
        this.appState.set('vinyl.rotation', rotation);
        
        if (this.vinylElement) {
            this.vinylElement.style.transform = `rotate(${rotation}deg)`;
        }
        
        if (this.albumArtElement) {
            this.albumArtElement.style.transform = `rotate(${rotation}deg)`;
        }
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
    
    
    destroy() {
        this.stopAnimation();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.removeAlbumArt();
        
        this.eventBus.emit('vinyl:destroyed');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VinylRenderer;
}

window.VinylRenderer = VinylRenderer;
