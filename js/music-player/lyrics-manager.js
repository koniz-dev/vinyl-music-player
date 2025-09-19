import { getDefaultLyricsColor } from '../constants/colors.js';

/**
 * Lyrics Manager
 * Handles lyrics display and timing
 */
export class LyricsManager {
    constructor() {
        this.lyrics = [];
        this.lyricsText = document.querySelector('.lyrics-text');
        
        // Set default lyrics color
        this.lyricsText.style.color = getDefaultLyricsColor();
    }

    /**
     * Update lyrics display based on current time
     * @param {number} currentTime - Current time in seconds
     * @param {boolean} isPlaying - Whether audio is playing
     */
    updateLyrics(currentTime, isPlaying) {
        if (!isPlaying) {
            this.lyricsText.textContent = '';
            return;
        }

        const currentLyric = this.getCurrentLyric(currentTime);
        
        if (currentLyric) {
            if (currentLyric.text !== this.lyricsText.textContent) {
                this.lyricsText.style.opacity = '0.5';
                setTimeout(() => {
                    this.lyricsText.textContent = currentLyric.text;
                    this.lyricsText.style.opacity = '1';
                }, 150);
            }
        } else {
            if (this.lyricsText.textContent !== '') {
                this.lyricsText.textContent = '';
            }
        }
    }

    /**
     * Get the current lyric based on time
     * @param {number} time - Current time in seconds
     * @returns {Object|null} Current lyric object or null
     */
    getCurrentLyric(time) {
        if (!this.lyrics || this.lyrics.length === 0) {
            return null;
        }
        
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i] && typeof this.lyrics[i].start !== 'undefined' && typeof this.lyrics[i].end !== 'undefined') {
                if (time >= this.lyrics[i].start && time < this.lyrics[i].end) {
                    return this.lyrics[i];
                }
            }
        }
        
        return null;
    }

    /**
     * Update lyrics from settings panel
     * @param {Array} newLyrics - Array of lyrics objects
     */
    updateLyricsFromSettings(newLyrics) {
        this.lyrics.length = 0;
        
        if (newLyrics && newLyrics.length > 0) {
            newLyrics.forEach(lyric => {
                if (lyric && 
                    typeof lyric.start !== 'undefined' && 
                    typeof lyric.end !== 'undefined' && 
                    typeof lyric.text !== 'undefined' && 
                    lyric.text.trim() !== '') {
                    this.lyrics.push(lyric);
                }
            });
        }
    }

    /**
     * Update lyrics color
     * @param {string} color - Color value
     */
    updateLyricsColor(color) {
        this.lyricsText.style.color = color;
    }

    /**
     * Clear lyrics display
     */
    clearLyrics() {
        this.lyricsText.textContent = '';
    }
}
