class MusicPlayerThemeManager {
    constructor() {
        this.currentPrimaryColor = '#8B4513';
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for music player color changes
        if (window.eventBus) {
            window.eventBus.on('musicPlayer:colorChanged', (data) => {
                this.updateMusicPlayerTheme(data.color);
            });
        }
    }
    
    updateMusicPlayerTheme(primaryColor) {
        this.currentPrimaryColor = primaryColor;
        
        // Calculate color variants using the same formula
        const colorVariants = this.calculateColorVariants(primaryColor);
        
        // Update CSS custom properties
        this.updateCSSVariables(colorVariants);
        
        // Update lyrics default color based on background
        this.updateLyricsDefaultColor(colorVariants);
        
        // Notify other components
        if (window.eventBus) {
            window.eventBus.emit('musicPlayer:themeUpdated', {
                primaryColor: primaryColor,
                variants: colorVariants
            });
        }
    }
    
    calculateColorVariants(primaryColor) {
        const rgb = this.hexToRgb(primaryColor);
        
        return {
            primary: primaryColor,
            primary80: this.rgbToRgba(rgb, 0.8),
            light80: this.lightenColor(rgb, 0.8),
            light40: this.lightenColor(rgb, 0.4),
            light35: this.lightenColor(rgb, 0.35),
            light35Alt: this.lightenColor(rgb, 0.35), // Slightly different calculation
            light25: this.lightenColor(rgb, 0.25),
            light20: this.lightenColor(rgb, 0.2),
            light15: this.lightenColor(rgb, 0.15),
            dark15: this.darkenColor(rgb, 0.15),
            dark20: this.darkenColor(rgb, 0.2),
            dark30: this.darkenColor(rgb, 0.3),
            dark40: this.darkenColor(rgb, 0.4),
            dark80: this.darkenColor(rgb, 0.8)
        };
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    rgbToRgba(rgb, alpha) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    
    lightenColor(rgb, amount) {
        const newR = Math.round(rgb.r + (255 - rgb.r) * amount);
        const newG = Math.round(rgb.g + (255 - rgb.g) * amount);
        const newB = Math.round(rgb.b + (255 - rgb.b) * amount);
        return this.rgbToHex(newR, newG, newB);
    }
    
    darkenColor(rgb, amount) {
        const newR = Math.round(rgb.r * (1 - amount));
        const newG = Math.round(rgb.g * (1 - amount));
        const newB = Math.round(rgb.b * (1 - amount));
        return this.rgbToHex(newR, newG, newB);
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    updateCSSVariables(variants) {
        const root = document.documentElement;
        
        root.style.setProperty('--vinyl-primary', variants.primary);
        root.style.setProperty('--vinyl-primary-80', variants.primary80);
        root.style.setProperty('--vinyl-primary-light-80', variants.light80);
        root.style.setProperty('--vinyl-primary-light-40', variants.light40);
        root.style.setProperty('--vinyl-primary-light-35', variants.light35);
        root.style.setProperty('--vinyl-primary-light-35-alt', variants.light35Alt);
        root.style.setProperty('--vinyl-primary-light-25', variants.light25);
        root.style.setProperty('--vinyl-primary-light-20', variants.light20);
        root.style.setProperty('--vinyl-primary-light-15', variants.light15);
        root.style.setProperty('--vinyl-primary-dark-15', variants.dark15);
        root.style.setProperty('--vinyl-primary-dark-20', variants.dark20);
        root.style.setProperty('--vinyl-primary-dark-30', variants.dark30);
        root.style.setProperty('--vinyl-primary-dark-40', variants.dark40);
        root.style.setProperty('--vinyl-primary-dark-80', variants.dark80);
    }
    
    updateLyricsDefaultColor(variants) {
        // Use dark-15 variant as default lyrics color for good contrast
        const defaultLyricsColor = variants.dark15;
        
        // Update lyrics color manager if it exists
        if (window.lyricsColorManager) {
            window.lyricsColorManager.setCurrentColor(defaultLyricsColor, false);
        }
        
        // Update the color picker value
        const lyricsColorPicker = document.getElementById('lyrics-color-picker');
        const lyricsColorPreview = document.getElementById('color-preview-input');
        
        if (lyricsColorPicker) {
            lyricsColorPicker.value = defaultLyricsColor;
        }
        
        if (lyricsColorPreview) {
            lyricsColorPreview.value = defaultLyricsColor.toUpperCase();
            lyricsColorPreview.style.backgroundColor = defaultLyricsColor;
            lyricsColorPreview.style.color = this.getContrastColor(defaultLyricsColor);
        }
        
        // Notify lyrics manager to update the display
        if (window.eventBus) {
            window.eventBus.emit('lyrics:colorChanged', { color: defaultLyricsColor });
        }
    }
    
    getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    getCurrentPrimaryColor() {
        return this.currentPrimaryColor;
    }
    
    getCurrentVariants() {
        return this.calculateColorVariants(this.currentPrimaryColor);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicPlayerThemeManager;
}

window.MusicPlayerThemeManager = MusicPlayerThemeManager;
