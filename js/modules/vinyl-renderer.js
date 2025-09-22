/**
 * Vinyl Renderer Module
 * Handles vinyl animation, album art, and visual effects
 */
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
    
    /**
     * Initialize DOM elements
     */
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
    
    /**
     * Setup DOM elements
     */
    setupElements() {
        this.vinylElement = document.querySelector('.vinyl-album-art');
        this.tonearmElement = null; // No tonearm in new design
        this.albumArtElement = document.querySelector('.vinyl-album-art');
        this.musicPlayerElement = document.querySelector('.music-player');
        
        if (!this.vinylElement) {
            console.warn('Vinyl album art element not found');
        }
    }
    
    /**
     * Start vinyl animation
     */
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.appState.set('vinyl.isAnimating', true);
        
        if (this.vinylElement) {
            this.vinylElement.style.animation = 'spin 12s linear infinite';
            this.vinylElement.style.animationPlayState = 'running';
        }
    }
    
    /**
     * Stop vinyl animation
     */
    stopAnimation() {
        if (!this.isAnimating) return;
        
        this.isAnimating = false;
        this.appState.set('vinyl.isAnimating', false);
        
        if (this.vinylElement) {
            this.vinylElement.style.animationPlayState = 'paused';
        }
    }
    
    /**
     * Update album art
     * @param {string} imageUrl - Album art URL
     */
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
    
    /**
     * Remove album art
     */
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
    
    
    /**
     * Update vinyl rotation
     * @param {number} rotation - Rotation angle in degrees
     */
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
    
    
    /**
     * Setup event listeners
     */
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
    
    
    /**
     * Cleanup resources
     */
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VinylRenderer;
}

window.VinylRenderer = VinylRenderer;
