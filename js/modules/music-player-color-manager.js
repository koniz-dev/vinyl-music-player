class MusicPlayerColorManager {
    constructor() {
        // Initialize with default color
        this.currentColor = '#8B4513';
        this.colorHistory = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateColorPreview();
        this.renderColorHistory();
        
        // Apply default color to music player
        this.sendColorToPlayer();
    }
    
    initializeElements() {
        this.colorPicker = document.getElementById('music-player-color-picker');
        this.colorPreviewInput = document.getElementById('music-player-color-preview-input');
        this.colorHistoryContainer = document.getElementById('music-player-color-history');
        this.copyHexBtn = document.getElementById('music-player-copy-hex-btn');
        this.resetColorBtn = document.getElementById('music-player-reset-color-btn');
        
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
        }
        this.updateColorPreview();
        this.renderColorHistory();
        this.saveCurrentColor();
        this.sendColorToPlayer();
    }
    
    updateColorPreviewOnly(color) {
        this.currentColor = color;
        this.updateColorPreview();
        this.sendColorToPlayer();
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
            window.eventBus.emit('musicPlayer:colorChanged', { color: this.currentColor });
        }
    }
    
    loadColorHistory() {
        try {
            const saved = localStorage.getItem('musicPlayerColorHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            window.safeLog.warn('Failed to load color history:', error);
            return [];
        }
    }
    
    saveColorHistory() {
        try {
            localStorage.setItem('musicPlayerColorHistory', JSON.stringify(this.colorHistory));
        } catch (error) {
            window.safeLog.warn('Failed to save color history:', error);
        }
    }
    
    loadCurrentColor() {
        try {
            const saved = localStorage.getItem('musicPlayerCurrentColor');
            return saved || '#8B4513';
        } catch (error) {
            window.safeLog.warn('Failed to load current color:', error);
            return '#8B4513';
        }
    }
    
    saveCurrentColor() {
        try {
            localStorage.setItem('musicPlayerCurrentColor', this.currentColor);
        } catch (error) {
            window.safeLog.warn('Failed to save current color:', error);
        }
    }
    
    resetToDefault() {
        this.currentColor = '#8B4513';
        
        this.moveDefaultColorToFront();
        this.saveCurrentColor();
    }
    
    ensureDefaultColorInHistory() {
        const defaultColor = '#8B4513';
        
        if (!this.colorHistory.includes(defaultColor)) {
            this.colorHistory.push(defaultColor);
            
            if (this.colorHistory.length > 5) {
                this.colorHistory = this.colorHistory.slice(0, 5);
            }
            
            this.saveColorHistory();
        }
    }
    
    moveDefaultColorToFront() {
        const defaultColor = '#8B4513';
        
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
                window.toastManager.showWarning('Invalid Color', 'Please enter a valid hex color (e.g., #8B4513)');
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicPlayerColorManager;
}

window.MusicPlayerColorManager = MusicPlayerColorManager;
