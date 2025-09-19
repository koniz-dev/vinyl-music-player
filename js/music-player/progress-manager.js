/**
 * Progress Manager
 * Handles progress bar and time display
 */
import { formatTime } from './utils.js';

export class ProgressManager {
    constructor() {
        this.progress = document.querySelector('.progress');
        this.currentTimeEl = document.querySelector('.current-time');
        this.progressBar = document.querySelector('.progress-bar');
        this.isProgressUpdating = false;
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Progress Bar Click Handler
        this.progressBar.addEventListener('click', (e) => {
            if (this.isProgressUpdating || !this.onProgressClick) return;
            this.isProgressUpdating = true;
            
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            
            if (this.onProgressClick) {
                this.onProgressClick(percent);
            }
            
            setTimeout(() => {
                this.isProgressUpdating = false;
            }, 100);
        });
    }

    /**
     * Update progress bar and time display
     * @param {number} currentTime - Current time in seconds
     * @param {number} totalTime - Total time in seconds
     */
    updateProgress(currentTime, totalTime) {
        if (totalTime > 0) {
            const progressPercent = (currentTime / totalTime) * 100;
            this.progress.style.width = `${Math.min(progressPercent, 100)}%`;
        }
        this.currentTimeEl.textContent = formatTime(currentTime);
    }

    /**
     * Update total time display
     * @param {number} totalTime - Total time in seconds
     */
    updateTotalTime(totalTime) {
        document.querySelector('.total-time').textContent = formatTime(totalTime);
    }

    /**
     * Set callback function for progress click
     * @param {Function} callback - Callback function
     */
    setProgressClickCallback(callback) {
        this.onProgressClick = callback;
    }
}
