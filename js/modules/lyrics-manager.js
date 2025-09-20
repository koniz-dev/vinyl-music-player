/**
 * Lyrics Manager Module
 * Handles lyrics display, timing, and management
 */
class LyricsManager {
    constructor() {
        this.lyricsContainer = null;
        this.lyricsTextElement = null;
        this.currentLyricIndex = -1;
        this.eventBus = window.eventBus;
        this.appState = window.appState;
        this.timeUtils = window.TimeUtils;
        
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
        this.lyricsContainer = document.querySelector('.lyrics-container');
        this.lyricsTextElement = document.querySelector('.vinyl-lyrics-text');
        
        if (!this.lyricsTextElement) {
            console.warn('Lyrics text element not found');
        } else {
            // Apply saved color when elements are ready
            this.applySavedColor();
        }
    }
    
    /**
     * Load lyrics from data
     * @param {Array} lyricsData - Array of lyric objects
     */
    loadLyrics(lyricsData) {
        if (!Array.isArray(lyricsData)) {
            console.error('Lyrics data must be an array');
            return;
        }
        
        // Validate and filter lyrics
        const validLyrics = lyricsData.filter(lyric => this.validateLyric(lyric));
        
        this.appState.set('lyrics.items', validLyrics);
        this.appState.set('lyrics.currentIndex', -1);
        
        this.eventBus.emit('lyrics:loaded', { 
            count: validLyrics.length,
            lyrics: validLyrics 
        });
        
        // Update display if audio is playing
        const isPlaying = this.appState.get('audio.isPlaying');
        if (isPlaying) {
            this.updateCurrentLyric();
        }
    }
    
    /**
     * Update current lyric based on audio time
     * @param {number} currentTime - Current audio time (optional, uses state if not provided)
     */
    updateCurrentLyric(currentTime = null) {
        const audioTime = currentTime || this.appState.get('audio.currentTime');
        const lyrics = this.appState.get('lyrics.items');
        
        if (!lyrics || lyrics.length === 0) {
            this.clearLyricsDisplay();
            return;
        }
        
        const newIndex = this.timeUtils.findCurrentLyricIndex(lyrics, audioTime);
        
        if (newIndex !== this.currentLyricIndex) {
            this.currentLyricIndex = newIndex;
            this.appState.set('lyrics.currentIndex', newIndex);
            
            if (newIndex >= 0) {
                this.displayLyric(lyrics[newIndex]);
            } else {
                this.clearLyricsDisplay();
            }
            
            this.eventBus.emit('lyrics:currentChanged', {
                index: newIndex,
                lyric: newIndex >= 0 ? lyrics[newIndex] : null
            });
        }
    }
    
    /**
     * Display a specific lyric
     * @param {Object} lyric - Lyric object
     */
    displayLyric(lyric) {
        if (!this.lyricsTextElement || !lyric) return;
        
        const currentText = this.lyricsTextElement.textContent;
        const newText = lyric.text || '';
        
        // Only update if text has changed
        if (currentText !== newText) {
            this.animateLyricChange(newText);
        }
    }
    
    /**
     * Animate lyric text change
     * @param {string} newText - New lyric text
     */
    animateLyricChange(newText) {
        if (!this.lyricsTextElement) return;
        
        // Fade out
        this.lyricsTextElement.style.opacity = '0.5';
        
        setTimeout(() => {
            this.lyricsTextElement.textContent = newText;
            this.lyricsTextElement.style.opacity = '1';
        }, 150);
    }
    
    /**
     * Clear lyrics display
     */
    clearLyricsDisplay() {
        if (!this.lyricsTextElement) return;
        
        if (this.lyricsTextElement.textContent !== '') {
            this.lyricsTextElement.textContent = '';
        }
    }
    
    /**
     * Set lyrics color
     * @param {string} color - Color in hex format
     */
    setLyricsColor(color) {
        if (!this.lyricsTextElement) return;
        
        this.appState.set('lyrics.color', color);
        this.lyricsTextElement.style.color = color;
        
        // Don't emit event here to avoid circular emission
        // The color change is already handled by the caller
    }
    
    /**
     * Get current lyrics color
     * @returns {string} Current color
     */
    getLyricsColor() {
        return this.appState.get('lyrics.color');
    }
    
    /**
     * Apply default color on page load
     */
    applySavedColor() {
        // Always apply default color on page load
        if (this.lyricsTextElement) {
            this.setLyricsColor('#ffb3d1'); // Default pink color
        }
    }
    
    /**
     * Validate lyric object
     * @param {Object} lyric - Lyric object to validate
     * @returns {boolean} True if valid
     */
    validateLyric(lyric) {
        if (!lyric || typeof lyric !== 'object') return false;
        
        const hasRequiredFields = 
            typeof lyric.start !== 'undefined' && 
            typeof lyric.end !== 'undefined' && 
            typeof lyric.text !== 'undefined';
        
        if (!hasRequiredFields) return false;
        
        const hasValidTime = 
            typeof lyric.start === 'number' && 
            typeof lyric.end === 'number' &&
            lyric.start >= 0 && 
            lyric.end > lyric.start;
        
        if (!hasValidTime) return false;
        
        const hasValidText = 
            typeof lyric.text === 'string' && 
            lyric.text.trim() !== '';
        
        return hasValidText;
    }
    
    /**
     * Parse lyrics from JSON string
     * @param {string} jsonString - JSON string containing lyrics
     * @returns {Array} Parsed lyrics array
     */
    parseLyricsFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!Array.isArray(data)) {
                throw new Error('JSON must be an array of objects');
            }
            
            const parsedLyrics = [];
            
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                
                if (typeof item !== 'object' || item === null) {
                    throw new Error(`Item at index ${i} must be an object`);
                }
                
                if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
                    throw new Error(`Item at index ${i} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
                }
                
                if (!this.timeUtils.isValidTimeFormat(item.start) || !this.timeUtils.isValidTimeFormat(item.end)) {
                    throw new Error(`Item at index ${i} has invalid time format. Use mm:ss format (e.g., "01:30")`);
                }
                
                const startSeconds = this.timeUtils.timeToSeconds(item.start);
                const endSeconds = this.timeUtils.timeToSeconds(item.end);
                
                if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                    throw new Error(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
                }
                
                parsedLyrics.push({
                    start: startSeconds,
                    end: endSeconds,
                    text: item.text.trim()
                });
            }
            
            return parsedLyrics;
            
        } catch (error) {
            throw new Error(`Error parsing JSON: ${error.message}`);
        }
    }
    
    /**
     * Export lyrics to JSON string
     * @returns {string} JSON string
     */
    exportLyricsToJSON() {
        const lyrics = this.appState.get('lyrics.items');
        
        const exportData = lyrics.map(lyric => ({
            start: this.timeUtils.secondsToTime(lyric.start),
            end: this.timeUtils.secondsToTime(lyric.end),
            text: lyric.text
        }));
        
        return JSON.stringify(exportData, null, 2);
    }
    
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for audio time updates
        this.eventBus.on('audio:timeUpdate', (data) => {
            this.updateCurrentLyric(data.currentTime);
        });
        
        // Listen for lyrics loading requests
        this.eventBus.on('lyrics:requestLoad', (data) => {
            this.loadLyrics(data.lyrics);
        });
        
        // Listen for color change requests
        this.eventBus.on('lyrics:requestColorChange', (data) => {
            this.setLyricsColor(data.color);
        });
        
        // Listen for color changes from LyricsColorManager
        this.eventBus.on('lyrics:colorChanged', (data) => {
            this.setLyricsColor(data.color);
        });
        
        // Listen for JSON import requests
        this.eventBus.on('lyrics:requestImportJSON', (data) => {
            try {
                const lyrics = this.parseLyricsFromJSON(data.jsonString);
                this.loadLyrics(lyrics);
                this.eventBus.emit('lyrics:importSuccess', { count: lyrics.length });
            } catch (error) {
                this.eventBus.emit('lyrics:importError', { error: error.message });
            }
        });
        
        // Listen for export requests
        this.eventBus.on('lyrics:requestExport', () => {
            const jsonString = this.exportLyricsToJSON();
            this.eventBus.emit('lyrics:exportComplete', { jsonString });
        });
        
        // Listen for AppState changes
        this.appState.subscribe('audio.isPlaying', (isPlaying) => {
            if (isPlaying) {
                this.updateCurrentLyric();
            }
        });
        
        this.appState.subscribe('audio.currentTime', (currentTime) => {
            const isPlaying = this.appState.get('audio.isPlaying');
            if (isPlaying) {
                this.updateCurrentLyric(currentTime);
            }
        });
    }
    
    
    
    /**
     * Clear all lyrics
     */
    clearLyrics() {
        this.appState.set('lyrics.items', []);
        this.appState.set('lyrics.currentIndex', -1);
        this.currentLyricIndex = -1;
        this.clearLyricsDisplay();
        
        this.eventBus.emit('lyrics:cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyricsManager;
}

window.LyricsManager = LyricsManager;
