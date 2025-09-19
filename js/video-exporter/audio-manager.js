import { getDefaultLyricsColor } from '../constants/colors.js';

/**
 * Export Audio Manager
 * Handles audio processing for video export
 */
export class ExportAudioManager {
    constructor() {
        this.exportAudio = null;
        this.exportLyrics = [];
        this.exportLyricsColor = getDefaultLyricsColor(); // Default lyrics color
    }

    /**
     * Load audio file for export
     * @param {File} audioFile - Audio file to load
     * @returns {Promise} Promise that resolves when audio is loaded
     */
    async loadAudio(audioFile) {
        const audioUrl = URL.createObjectURL(audioFile);
        this.exportAudio = new Audio(audioUrl);
        
        await new Promise((resolve, reject) => {
            this.exportAudio.addEventListener('loadedmetadata', resolve);
            this.exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        return this.exportAudio;
    }

    /**
     * Load lyrics data
     */
    loadLyrics() {
        this.exportLyrics = [...(window.musicPlayer ? window.musicPlayer.lyricsManager.getLyrics() : [])];
        
        // Get current lyrics color from settings
        if (window.controlPanel && window.controlPanel.colorManager) {
            this.exportLyricsColor = window.controlPanel.colorManager.getCurrentColor();
        } else if (window.lyricsColorManager) {
            // Fallback for backward compatibility
            this.exportLyricsColor = window.lyricsColorManager.getCurrentColor();
        } else {
            // Final fallback to default color
            this.exportLyricsColor = getDefaultLyricsColor();
        }
    }

    /**
     * Update lyrics color
     * @param {string} color - New lyrics color
     */
    updateLyricsColor(color) {
        this.exportLyricsColor = color;
    }

    /**
     * Get current lyric based on time
     * @param {number} time - Current time in seconds
     * @returns {Object|null} Current lyric object or null
     */
    getCurrentLyric(time) {
        if (!this.exportLyrics || this.exportLyrics.length === 0) {
            return null;
        }
        
        return this.exportLyrics.find(lyric => 
            time >= lyric.start && time <= lyric.end
        );
    }

    /**
     * Play audio
     */
    play() {
        if (this.exportAudio) {
            this.exportAudio.play();
        }
    }

    /**
     * Pause audio
     */
    pause() {
        if (this.exportAudio) {
            this.exportAudio.pause();
        }
    }

    /**
     * Get audio element
     * @returns {HTMLAudioElement} Audio element
     */
    getAudio() {
        return this.exportAudio;
    }

    /**
     * Get lyrics data
     * @returns {Array} Lyrics array
     */
    getLyrics() {
        return this.exportLyrics;
    }

    /**
     * Get lyrics color
     * @returns {string} Lyrics color
     */
    getLyricsColor() {
        return this.exportLyricsColor;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.exportAudio) {
            this.exportAudio.pause();
            this.exportAudio = null;
        }
    }
}
