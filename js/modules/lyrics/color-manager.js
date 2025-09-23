class LyricsColorManager {
    constructor() {
        // Calculate default color from base color using formula
        const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
        this.currentColor = this.addRgb(baseRgb, -126, -129, -127);
        this.colorHistory = [];
        this.isInitializing = true; // Flag to prevent event emissions during init
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateColorPreview();
        this.renderColorHistory();
        
        // Apply default color to lyrics
        this.sendColorToPlayer();
        
        this.isInitializing = false; // Clear flag after initialization
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    addRgb(rgb, rOffset, gOffset, bOffset) {
        const newR = Math.max(0, Math.min(255, rgb.r + rOffset));
        const newG = Math.max(0, Math.min(255, rgb.g + gOffset));
        const newB = Math.max(0, Math.min(255, rgb.b + bOffset));
        return this.rgbToHex(newR, newG, newB);
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    initializeElements() {
        this.colorPicker = document.getElementById('lyrics-color-picker');
        this.colorPreviewInput = document.getElementById('color-preview-input');
        this.colorHistoryContainer = document.getElementById('color-history');
        this.copyHexBtn = document.getElementById('copy-hex-btn');
        this.resetColorBtn = document.getElementById('reset-color-btn');
        
        // Ensure color preview is updated after DOM elements are ready
        if (this.colorPreviewInput && this.colorPicker) {
            this.updateColorPreview();
        }
    }
    
    setupEventListeners() {
        if (this.colorPicker) {
            this.colorPicker.addEventListener('input', (e) => {
                this.updateColorPreviewOnly(e.target.value);
            });
            this.colorPicker.addEventListener('change', (e) => {
                this.setCurrentColor(e.target.value);
            });
        }
        
        if (this.colorPreviewInput) {
            this.colorPreviewInput.addEventListener('input', (e) => {
                this.handleHexInput(e.target.value);
            });
            this.colorPreviewInput.addEventListener('blur', (e) => {
                this.validateAndSetHexColor(e.target.value);
            });
            this.colorPreviewInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validateAndSetHexColor(e.target.value);
                }
            });
        }
        
        if (this.copyHexBtn) {
            this.copyHexBtn.addEventListener('click', () => {
                this.copyHexToClipboard();
            });
        }
        
        if (this.resetColorBtn) {
            this.resetColorBtn.addEventListener('click', () => {
                this.resetToDefault();
                this.updateColorPreview();
                this.renderColorHistory();
                this.sendColorToPlayer();
            });
        }
    }
    
    setCurrentColor(color, addToHistory = true) {
        this.currentColor = color;
        if (addToHistory) {
            this.addToHistory(color);
            this.ensureDefaultColorInHistory();
            // Notify theme manager that lyrics color was manually changed
            if (window.musicPlayerThemeManager) {
                window.musicPlayerThemeManager.setLyricsColorManuallySet(true);
            }
        }
        this.updateColorPreview();
        this.renderColorHistory();
        this.saveCurrentColor();
        
        // Only emit if not during initialization or theme update
        if (!this.isInitializing && !this.isThemeUpdating) {
            this.sendColorToPlayer();
        }
    }
    
    updateColorPreviewOnly(color) {
        this.currentColor = color;
        this.updateColorPreview();
        // Don't emit here to avoid excessive events during color picker interaction
        // The 'change' event will handle the final emission
    }
    
    addToHistory(color) {
        // Remove if already exists and add to front
        this.colorHistory = this.colorHistory.filter(c => c !== color);
        this.colorHistory.unshift(color);
        
        // Limit history size
        if (this.colorHistory.length > 5) {
            this.colorHistory = this.colorHistory.slice(0, 5);
        }
        
        this.saveColorHistory();
    }
    
    updateColorPreview() {
        if (this.colorPicker) {
            this.colorPicker.value = this.currentColor;
        }
        
        if (this.colorPreviewInput) {
            this.colorPreviewInput.value = this.currentColor.toUpperCase();
            this.colorPreviewInput.style.backgroundColor = this.currentColor;
            this.colorPreviewInput.style.color = this.getContrastColor(this.currentColor);
        }
    }
    
    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    renderColorHistory() {
        if (!this.colorHistoryContainer) return;
        
        this.colorHistoryContainer.innerHTML = '';
        
        const colorHistorySection = document.querySelector('.color-history-section');
        if (colorHistorySection) {
            colorHistorySection.style.display = this.colorHistory.length > 0 ? 'block' : 'none';
        }
        
        this.colorHistory.forEach((color, index) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'color-history-item';
            colorItem.style.backgroundColor = color;
            colorItem.title = color.toUpperCase();
            
            colorItem.addEventListener('click', () => {
                this.setCurrentColor(color, false);
            });
            
            this.colorHistoryContainer.appendChild(colorItem);
        });
    }
    
    copyHexToClipboard() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.currentColor.toUpperCase()).then(() => {
                if (window.toastManager) {
                    window.toastManager.showSuccess('Copied!', `Color ${this.currentColor.toUpperCase()} copied to clipboard`);
                }
            }).catch(() => {
                this.fallbackCopyToClipboard();
            });
        } else {
            this.fallbackCopyToClipboard();
        }
    }
    
    fallbackCopyToClipboard() {
        const textArea = document.createElement('textarea');
        textArea.value = this.currentColor.toUpperCase();
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            if (window.toastManager) {
                window.toastManager.showSuccess('Copied!', `Color ${this.currentColor.toUpperCase()} copied to clipboard`);
            }
        } catch (err) {
            if (window.toastManager) {
                window.toastManager.showError('Copy Failed', 'Failed to copy color to clipboard');
            }
        }
        
        document.body.removeChild(textArea);
    }
    
    sendColorToPlayer() {
        if (window.eventBus) {
            window.eventBus.emit('lyrics:colorChanged', { color: this.currentColor });
        }
    }
    
    // Method to set color without emitting events (for internal updates)
    setCurrentColorSilently(color) {
        this.currentColor = color;
        this.updateColorPreview();
        this.renderColorHistory();
        this.saveCurrentColor();
        // Don't call sendColorToPlayer() to avoid duplicate emissions
    }
    
    loadColorHistory() {
        try {
            const saved = localStorage.getItem('lyricsColorHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            window.safeLog.warn('Failed to load color history:', error);
            return [];
        }
    }
    
    saveColorHistory() {
        try {
            localStorage.setItem('lyricsColorHistory', JSON.stringify(this.colorHistory));
        } catch (error) {
            window.safeLog.warn('Failed to save color history:', error);
        }
    }
    
    loadCurrentColor() {
        try {
            const saved = localStorage.getItem('lyricsCurrentColor');
            const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
            return saved || this.addRgb(baseRgb, -126, -129, -127);
        } catch (error) {
            window.safeLog.warn('Failed to load current color:', error);
            const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
            return this.addRgb(baseRgb, -126, -129, -127);
        }
    }
    
    saveCurrentColor() {
        try {
            localStorage.setItem('lyricsCurrentColor', this.currentColor);
        } catch (error) {
            window.safeLog.warn('Failed to save current color:', error);
        }
    }
    
    
    resetToDefault() {
        // Calculate default color from base color using formula
        const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
        this.currentColor = this.addRgb(baseRgb, -126, -129, -127);
        
        this.moveDefaultColorToFront();
        this.saveCurrentColor();
    }
    
    ensureDefaultColorInHistory() {
        const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
        const defaultColor = this.addRgb(baseRgb, -126, -129, -127);
        
        if (!this.colorHistory.includes(defaultColor)) {
            this.colorHistory.push(defaultColor);
            
            if (this.colorHistory.length > 5) {
                this.colorHistory = this.colorHistory.slice(0, 5);
            }
            
            this.saveColorHistory();
        }
    }
    
    moveDefaultColorToFront() {
        const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
        const defaultColor = this.addRgb(baseRgb, -126, -129, -127);
        
        this.colorHistory = this.colorHistory.filter(c => c !== defaultColor);
        this.colorHistory.unshift(defaultColor);
        
        if (this.colorHistory.length > 5) {
            this.colorHistory = this.colorHistory.slice(0, 5);
        }
        
        this.saveColorHistory();
    }
    
    getCurrentColor() {
        return this.currentColor;
    }
    
    handleHexInput(value) {
        let formattedValue = value.replace(/[^0-9A-Fa-f#]/g, '');
        if (formattedValue && !formattedValue.startsWith('#')) {
            formattedValue = '#' + formattedValue;
        }
        
        if (this.colorPreviewInput) {
            this.colorPreviewInput.value = formattedValue;
        }
    }
    
    validateAndSetHexColor(value) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        
        if (hexRegex.test(value)) {
            this.setCurrentColor(value);
        } else {
            if (this.colorPreviewInput) {
                this.colorPreviewInput.value = this.currentColor.toUpperCase();
            }
            
            if (window.toastManager) {
                const baseRgb = this.hexToRgb(window.Constants.PLAYER_BASE_COLOR);
                const exampleColor = this.addRgb(baseRgb, -126, -129, -127);
                window.toastManager.showWarning('Invalid Color', `Please enter a valid hex color (e.g., ${exampleColor})`);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LyricsColorManager;
}

window.LyricsColorManager = LyricsColorManager;
