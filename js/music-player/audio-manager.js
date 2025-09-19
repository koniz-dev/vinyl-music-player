/**
 * Audio Manager
 * Handles audio playback, time tracking, and audio-related events
 */
export class AudioManager {
    constructor() {
        this.audioElement = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.totalTime = 0;
        this.isMuted = false;
        this.isRepeat = false;
    }

    /**
     * Create and setup audio element
     * @param {string} audioUrl - URL of the audio file
     * @param {Object} callbacks - Callback functions for events
     */
    setupAudio(audioUrl, callbacks) {
        this.audioElement = new Audio(audioUrl);
        
        // Setup audio event listeners
        this.audioElement.addEventListener('loadedmetadata', () => {
            this.totalTime = Math.floor(this.audioElement.duration);
            if (callbacks.onLoadedMetadata) {
                callbacks.onLoadedMetadata(this.totalTime);
            }
        });
        
        this.audioElement.addEventListener('timeupdate', () => {
            this.currentTime = this.audioElement.currentTime;
            if (callbacks.onTimeUpdate) {
                callbacks.onTimeUpdate(this.currentTime);
            }
        });
        
        this.audioElement.addEventListener('ended', () => {
            if (this.isRepeat) {
                this.audioElement.currentTime = 0;
                this.audioElement.play();
            } else {
                this.isPlaying = false;
                if (callbacks.onEnded) {
                    callbacks.onEnded();
                }
            }
        });
    }

    /**
     * Start playing audio
     */
    async play() {
        if (!this.audioElement) return;
        
        try {
            await this.audioElement.play();
            this.isPlaying = true;
        } catch (error) {
            this.isPlaying = false;
        }
    }

    /**
     * Pause audio
     */
    pause() {
        if (!this.audioElement) return;
        
        this.audioElement.pause();
        this.isPlaying = false;
    }

    /**
     * Toggle play/pause state
     */
    async togglePlayPause() {
        if (!this.audioElement) return;
        
        if (this.isPlaying) {
            this.pause();
        } else {
            if (this.audioElement.ended) {
                this.restartAudio();
            } else {
                await this.play();
            }
        }
    }

    /**
     * Restart audio from the beginning
     */
    async restartAudio() {
        if (!this.audioElement) return;
        
        this.audioElement.currentTime = 0;
        this.currentTime = 0;
        
        setTimeout(async () => {
            await this.play();
        }, 100);
    }

    /**
     * Set current time
     * @param {number} time - Time in seconds
     */
    setCurrentTime(time) {
        if (!this.audioElement) return;
        
        this.currentTime = time;
        this.audioElement.currentTime = time;
    }

    /**
     * Toggle mute state
     */
    toggleMute() {
        if (!this.audioElement) return;
        
        this.isMuted = !this.isMuted;
        this.audioElement.muted = this.isMuted;
    }

    /**
     * Toggle repeat state
     */
    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
    }
}
