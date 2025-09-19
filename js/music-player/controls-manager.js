/**
 * Controls Manager
 * Handles button controls and their states
 */
export class ControlsManager {
    constructor() {
        this.playPauseBtn = document.querySelector('.play-pause-btn');
        this.muteBtn = document.querySelector('.mute-btn');
        this.repeatBtn = document.querySelector('.repeat-btn');
        
        this.setupEventListeners();
        this.disableControls(); // Disable controls initially
    }

    /**
     * Setup event listeners for control buttons
     */
    setupEventListeners() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => {
            if (this.onPlayPauseClick) {
                this.onPlayPauseClick();
            }
        });

        // Mute button
        this.muteBtn.addEventListener('click', () => {
            if (this.onMuteClick) {
                this.onMuteClick();
            }
        });

        // Repeat button
        this.repeatBtn.addEventListener('click', () => {
            if (this.onRepeatClick) {
                this.onRepeatClick();
            }
        });
    }

    /**
     * Update play/pause button state
     * @param {boolean} isPlaying - Whether audio is playing
     */
    updatePlayPauseButton(isPlaying) {
        if (isPlaying) {
            this.playPauseBtn.textContent = '⏸';
        } else {
            this.playPauseBtn.textContent = '▶';
        }
    }

    /**
     * Update mute button state
     * @param {boolean} isMuted - Whether audio is muted
     */
    updateMuteButton(isMuted) {
        if (isMuted) {
            this.muteBtn.textContent = '🔇';
            this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        } else {
            this.muteBtn.textContent = '🔊';
            this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        }
    }

    /**
     * Update repeat button state
     * @param {boolean} isRepeat - Whether repeat is enabled
     */
    updateRepeatButton(isRepeat) {
        if (isRepeat) {
            this.repeatBtn.style.background = 'rgba(102, 126, 234, 0.3)';
            this.repeatBtn.style.color = '#667eea';
        } else {
            this.repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            this.repeatBtn.style.color = 'white';
        }
    }

    /**
     * Disable all control buttons
     */
    disableControls() {
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    /**
     * Enable all control buttons
     */
    enableControls() {
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        this.muteBtn.textContent = '🔊';
        this.muteBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        this.repeatBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        this.repeatBtn.style.color = 'white';
    }

    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.onPlayPauseClick = callbacks.onPlayPauseClick;
        this.onMuteClick = callbacks.onMuteClick;
        this.onRepeatClick = callbacks.onRepeatClick;
    }
}
