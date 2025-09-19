/**
 * Lyrics Color Management Class
 * Handles color picker, history, and persistence for lyrics colors
 */
export class ColorManager {
    constructor() {
        this.colorHistory = this.loadColorHistory();
        this.currentColor = this.loadCurrentColor();
        this.maxHistorySize = 5;
        
        // Clear any old default colors from localStorage
        this.cleanupOldDefaultColors();
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateColorPreview();
        this.renderColorHistory();
        // Send initial color to player without adding to history
        this.sendColorToPlayer();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.colorPicker = document.getElementById('lyrics-color-picker');
        this.colorPreview = document.getElementById('color-preview');
        this.colorHistoryContainer = document.getElementById('color-history');
        this.copyHexBtn = document.getElementById('copy-hex-btn');
    }
    
    /**
     * Setup event listeners for color picker and copy button
     */
    setupEventListeners() {
        this.colorPicker.addEventListener('input', (e) => {
            this.updateColorPreviewOnly(e.target.value);
        });
        this.colorPicker.addEventListener('change', (e) => {
            this.setCurrentColor(e.target.value);
        });
        
        this.copyHexBtn.addEventListener('click', () => {
            this.copyHexToClipboard();
        });
    }
    
    /**
     * Set current color and optionally add to history
     * @param {string} color - The color to set
     * @param {boolean} addToHistory - Whether to add to history
     */
    setCurrentColor(color, addToHistory = true) {
        this.currentColor = color;
        if (addToHistory) {
            this.addToHistory(color);
        }
        this.updateColorPreview();
        this.renderColorHistory();
        this.saveCurrentColor();
        this.sendColorToPlayer();
    }
    
    /**
     * Update color preview only (without saving to history)
     * @param {string} color - The color to preview
     */
    updateColorPreviewOnly(color) {
        this.currentColor = color;
        this.updateColorPreview();
        this.sendColorToPlayer();
    }
    
    /**
     * Add color to history (excluding default colors)
     * @param {string} color - The color to add
     */
    addToHistory(color) {
        // Don't add default color to history
        if (color === '#ffb3d1') {
            return;
        }
        
        // Remove if already exists
        this.colorHistory = this.colorHistory.filter(c => c !== color);
        
        // Add to beginning
        this.colorHistory.unshift(color);
        
        // Keep only max history size
        if (this.colorHistory.length > this.maxHistorySize) {
            this.colorHistory = this.colorHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveColorHistory();
    }
    
    /**
     * Update color preview display
     */
    updateColorPreview() {
        this.colorPreview.textContent = this.currentColor.toUpperCase();
        this.colorPreview.style.backgroundColor = this.currentColor;
        this.colorPreview.style.color = this.getContrastColor(this.currentColor);
        this.colorPicker.value = this.currentColor;
    }
    
    /**
     * Get contrasting text color for background
     * @param {string} hexColor - The background color in hex format
     * @returns {string} The contrasting text color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    /**
     * Render color history items
     */
    renderColorHistory() {
        this.colorHistoryContainer.innerHTML = '';
        
        // Only show color history section if there are colors
        const colorHistorySection = document.querySelector('.color-history-section');
        
        if (this.colorHistory.length === 0) {
            colorHistorySection.classList.add('hidden');
            return;
        } else {
            colorHistorySection.classList.remove('hidden');
        }
        
        // Render existing colors
        this.colorHistory.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-history-item';
            colorItem.style.backgroundColor = color;
            colorItem.title = color.toUpperCase();
            
            colorItem.addEventListener('click', () => {
                this.setCurrentColor(color, false); // Don't add to history when clicking existing color
            });
            
            this.colorHistoryContainer.appendChild(colorItem);
        });
    }
    
    /**
     * Send current color to music player
     */
    sendColorToPlayer() {
        window.postMessage({
            type: 'UPDATE_LYRICS_COLOR',
            color: this.currentColor
        }, '*');
    }
    
    /**
     * Local Storage Methods
     */
    
    /**
     * Load color history from localStorage
     * @returns {Array} Array of saved colors
     */
    loadColorHistory() {
        try {
            const saved = localStorage.getItem('lyricsColorHistory');
            const history = saved ? JSON.parse(saved) : [];
            // Filter out any default colors that might have been saved before
            return history.filter(color => color !== '#ffb3d1' && color !== '#ffffff');
        } catch (e) {
            return [];
        }
    }
    
    /**
     * Save color history to localStorage
     */
    saveColorHistory() {
        try {
            localStorage.setItem('lyricsColorHistory', JSON.stringify(this.colorHistory));
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Load current color from localStorage
     * @returns {string} The saved current color or default
     */
    loadCurrentColor() {
        try {
            return localStorage.getItem('lyricsCurrentColor') || '#ffb3d1';
        } catch (e) {
            return '#ffb3d1';
        }
    }
    
    /**
     * Save current color to localStorage
     */
    saveCurrentColor() {
        try {
            localStorage.setItem('lyricsCurrentColor', this.currentColor);
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Get current color
     * @returns {string} The current color
     */
    getCurrentColor() {
        return this.currentColor;
    }
    
    /**
     * Clean up old default colors from localStorage
     */
    cleanupOldDefaultColors() {
        // Force clear any existing color history to start fresh
        this.colorHistory = [];
        this.saveColorHistory();
        
        // Also clear any old default colors from localStorage
        try {
            localStorage.removeItem('lyricsColorHistory');
        } catch (e) {
            // Silently handle localStorage errors
        }
    }
    
    /**
     * Copy current color hex value to clipboard
     */
    async copyHexToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentColor);
            this.showCopyFeedback();
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyToClipboard();
        }
    }
    
    /**
     * Show visual feedback for successful copy
     */
    showCopyFeedback() {
        const originalIcon = this.copyHexBtn.querySelector('.copy-icon').textContent;
        this.copyHexBtn.classList.add('copied');
        this.copyHexBtn.querySelector('.copy-icon').textContent = '✓';
        
        this.showToastNotification('success', 'Color Copied', `Hex color ${this.currentColor} copied to clipboard!`);
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.copyHexBtn.classList.remove('copied');
            this.copyHexBtn.querySelector('.copy-icon').textContent = originalIcon;
        }, 2000);
    }
    
    /**
     * Fallback copy method for older browsers
     */
    fallbackCopyToClipboard() {
        const textArea = document.createElement('textarea');
        textArea.value = this.currentColor;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        this.showCopyFeedback();
    }
    
    /**
     * Show toast notification
     * @param {string} type - Type of notification (success, error, info, warning)
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    showToastNotification(type, title, message) {
        if (window.toastSystem) {
            window.toastSystem.showToast(type, title, message);
        } else {
            // Fallback to alert if toast system is not available
            alert(`${title}: ${message}`);
        }
    }
}

// Note: This class is now exported and will be instantiated by the main index.js
