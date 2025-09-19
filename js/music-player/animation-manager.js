/**
 * Animation Manager
 * Handles vinyl and tonearm animations
 */
export class AnimationManager {
    constructor() {
        this.vinyl = document.getElementById('vinyl');
        this.tonearm = document.getElementById('tonearm');
    }

    /**
     * Update tonearm animation state
     * @param {boolean} isPlaying - Whether audio is playing
     */
    updateTonearm(isPlaying) {
        if (isPlaying) {
            this.tonearm.classList.add('playing');
        } else {
            this.tonearm.classList.remove('playing');
        }
    }

    /**
     * Update player state (play/pause, animations)
     * @param {boolean} isPlaying - Whether audio is playing
     */
    updatePlayerState(isPlaying) {
        if (isPlaying) {
            // Ensure animation is set before starting
            if (!this.vinyl.style.animation || this.vinyl.style.animation === 'none') {
                this.vinyl.style.animation = 'spin 8s linear infinite';
            }
            this.vinyl.style.animationPlayState = 'running';
            this.tonearm.classList.add('playing');
        } else {
            this.vinyl.style.animationPlayState = 'paused';
            this.tonearm.classList.remove('playing');
        }
    }
}
