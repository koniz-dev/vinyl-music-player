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
        this.vinylElement = document.getElementById('vinyl');
        this.tonearmElement = document.getElementById('tonearm');
        this.albumArtElement = document.querySelector('.vinyl-album-art');
        this.musicPlayerElement = document.querySelector('.music-player');
        
        if (!this.vinylElement) {
            console.warn('Vinyl element not found');
        }
        
        if (!this.tonearmElement) {
            console.warn('Tonearm element not found');
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
            this.vinylElement.style.animation = 'spin 8s linear infinite';
            this.vinylElement.style.animationPlayState = 'running';
        }
        
        if (this.tonearmElement) {
            this.tonearmElement.classList.add('playing');
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
        
        if (this.tonearmElement) {
            this.tonearmElement.classList.remove('playing');
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
        
        // Update music player background
        if (this.musicPlayerElement) {
            this.musicPlayerElement.style.backgroundImage = `url(${imageUrl})`;
            this.musicPlayerElement.style.backgroundSize = 'cover';
            this.musicPlayerElement.style.backgroundPosition = 'center';
            this.musicPlayerElement.style.backgroundRepeat = 'no-repeat';
            this.musicPlayerElement.style.position = 'relative';
            
            // Add overlay
            this.addAlbumOverlay();
            
            // Update z-index for child elements
            this.updateChildElementsZIndex();
        }
        
        // Update vinyl album art
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
        // Remove music player background
        if (this.musicPlayerElement) {
            this.musicPlayerElement.style.backgroundImage = '';
            this.musicPlayerElement.style.backgroundSize = '';
            this.musicPlayerElement.style.backgroundPosition = '';
            this.musicPlayerElement.style.backgroundRepeat = '';
            
            // Remove overlay
            this.removeAlbumOverlay();
            
            // Reset z-index for child elements
            this.resetChildElementsZIndex();
        }
        
        // Remove vinyl album art
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
     * Add album overlay to music player
     */
    addAlbumOverlay() {
        if (!this.musicPlayerElement) return;
        
        // Remove existing overlay
        this.removeAlbumOverlay();
        
        // Create new overlay
        const overlay = document.createElement('div');
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
        
        this.musicPlayerElement.appendChild(overlay);
    }
    
    /**
     * Remove album overlay
     */
    removeAlbumOverlay() {
        if (!this.musicPlayerElement) return;
        
        const overlay = this.musicPlayerElement.querySelector('.album-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    /**
     * Update z-index for child elements
     */
    updateChildElementsZIndex() {
        if (!this.musicPlayerElement) return;
        
        const elements = [
            '.vinyl-section',
            '.progress-container',
            '.controls'
        ];
        
        elements.forEach(selector => {
            const element = this.musicPlayerElement.querySelector(selector);
            if (element) {
                element.style.position = 'relative';
                element.style.zIndex = '2';
            }
        });
    }
    
    /**
     * Reset z-index for child elements
     */
    resetChildElementsZIndex() {
        if (!this.musicPlayerElement) return;
        
        const elements = [
            '.vinyl-section',
            '.progress-container',
            '.controls'
        ];
        
        elements.forEach(selector => {
            const element = this.musicPlayerElement.querySelector(selector);
            if (element) {
                element.style.position = '';
                element.style.zIndex = '';
            }
        });
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
