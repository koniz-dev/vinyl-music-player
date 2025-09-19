/**
 * Display Manager
 * Handles song info and album art display
 */
export class DisplayManager {
    constructor() {
        this.musicPlayer = document.querySelector('.music-player');
        this.albumArt = document.querySelector('.vinyl-album-art');
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
     * Update album art display
     * @param {string} imageUrl - URL of the album art image
     */
    updateAlbumArt(imageUrl) {
        if (this.musicPlayer && imageUrl) {
            // Set background image for music player
            this.musicPlayer.style.backgroundImage = `url(${imageUrl})`;
            this.musicPlayer.style.backgroundSize = 'cover';
            this.musicPlayer.style.backgroundPosition = 'center';
            this.musicPlayer.style.backgroundRepeat = 'no-repeat';
            this.musicPlayer.style.position = 'relative';
            
            // Create overlay for better text readability
            let overlay = this.musicPlayer.querySelector('.album-overlay');
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
                this.musicPlayer.appendChild(overlay);
            }
            
            // Ensure UI elements are above overlay
            const vinylSection = this.musicPlayer.querySelector('.vinyl-section');
            const progressContainer = this.musicPlayer.querySelector('.progress-container');
            const controls = this.musicPlayer.querySelector('.controls');
            
            if (vinylSection) vinylSection.style.position = 'relative';
            if (vinylSection) vinylSection.style.zIndex = '2';
            if (progressContainer) progressContainer.style.position = 'relative';
            if (progressContainer) progressContainer.style.zIndex = '2';
            if (controls) controls.style.position = 'relative';
            if (controls) controls.style.zIndex = '2';
        }
        
        if (this.albumArt && imageUrl) {
            // Set album art for vinyl center
            this.albumArt.style.backgroundImage = `url(${imageUrl})`;
            this.albumArt.style.backgroundSize = 'cover';
            this.albumArt.style.backgroundPosition = 'center';
            this.albumArt.style.backgroundRepeat = 'no-repeat';
            this.albumArt.style.borderRadius = '50%';
            this.albumArt.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
        }
    }

    /**
     * Remove album art display
     */
    removeAlbumArt() {
        if (this.musicPlayer) {
            // Reset music player background
            this.musicPlayer.style.backgroundImage = '';
            this.musicPlayer.style.backgroundSize = '';
            this.musicPlayer.style.backgroundPosition = '';
            this.musicPlayer.style.backgroundRepeat = '';
            
            // Remove overlay
            const overlay = this.musicPlayer.querySelector('.album-overlay');
            if (overlay) {
                overlay.remove();
            }
            
            // Reset z-index for UI elements
            const vinylSection = this.musicPlayer.querySelector('.vinyl-section');
            const progressContainer = this.musicPlayer.querySelector('.progress-container');
            const controls = this.musicPlayer.querySelector('.controls');
            
            if (vinylSection) vinylSection.style.position = '';
            if (vinylSection) vinylSection.style.zIndex = '';
            if (progressContainer) progressContainer.style.position = '';
            if (progressContainer) progressContainer.style.zIndex = '';
            if (controls) controls.style.position = '';
            if (controls) controls.style.zIndex = '';
        }
        
        if (this.albumArt) {
            // Reset album art styles
            this.albumArt.style.backgroundImage = '';
            this.albumArt.style.backgroundSize = '';
            this.albumArt.style.backgroundPosition = '';
            this.albumArt.style.backgroundRepeat = '';
            this.albumArt.style.borderRadius = '';
            this.albumArt.style.boxShadow = '';
        }
    }
}
