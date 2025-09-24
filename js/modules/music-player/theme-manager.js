class MusicPlayerThemeManager extends BaseModule {
    constructor() {
        super('MusicPlayerThemeManager');
        this.currentPrimaryColor = window.Constants.PLAYER_BASE_COLOR;
        this.lyricsColorManuallySet = false;
    }
    
    setupEventListeners() {
        // Listen for music player color changes
        if (window.eventBus) {
            window.eventBus.on('musicPlayer:colorChanged', (data) => {
                this.updateMusicPlayerTheme(data.color);
            });
        } else {
            // If eventBus is not ready, wait for it
            const checkEventBus = () => {
                if (window.eventBus) {
                    window.eventBus.on('musicPlayer:colorChanged', (data) => {
                        this.updateMusicPlayerTheme(data.color);
                    });
                } else {
                    setTimeout(checkEventBus, 50);
                }
            };
            checkEventBus();
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
    
    calculateColorVariants(baseColor) {
        const rgb = ColorHelper.hexToRgb(baseColor);
        
        // Calculate all colors based on RGB formula from CSS comments
        return {
            base: baseColor,
            light: ColorHelper.addRgbOffset(rgb, 17, 16, 20),      // +17, +16, +20
            lighter: ColorHelper.addRgbOffset(rgb, 16, 16, 16),    // +16, +16, +16
            neutral: ColorHelper.addRgbOffset(rgb, -4, -8, -9),    // -4, -8, -9
            muted: ColorHelper.addRgbOffset(rgb, -27, -27, -27),   // -27, -27, -27
            subtle: ColorHelper.addRgbOffset(rgb, -24, -24, -24),  // -24, -24, -24
            medium: ColorHelper.addRgbOffset(rgb, -82, -92, -103), // -82, -92, -103
            strong: ColorHelper.addRgbOffset(rgb, -80, -80, -80),  // -80, -80, -80
            dark: ColorHelper.addRgbOffset(rgb, -93, -96, -95),    // -93, -96, -95
            darker: ColorHelper.addRgbOffset(rgb, -78, -79, -57),  // -78, -79, -57
            accent: ColorHelper.addRgbOffset(rgb, -16, -74, -118), // -16, -74, -118
            primary: ColorHelper.addRgbOffset(rgb, -61, -120, -150) // -61, -120, -150
        };
    }
    
    // Color methods are now handled by ColorHelper
    
    rgbToRgba(rgb, alpha) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    
    lightenColor(rgb, amount) {
        const newR = Math.round(rgb.r + (255 - rgb.r) * amount);
        const newG = Math.round(rgb.g + (255 - rgb.g) * amount);
        const newB = Math.round(rgb.b + (255 - rgb.b) * amount);
        return ColorHelper.rgbToHex(newR, newG, newB);
    }
    
    darkenColor(rgb, amount) {
        const newR = Math.round(rgb.r * (1 - amount));
        const newG = Math.round(rgb.g * (1 - amount));
        const newB = Math.round(rgb.b * (1 - amount));
        return ColorHelper.rgbToHex(newR, newG, newB);
    }
    
    // rgbToHex is now handled by ColorHelper
    
    updateCSSVariables(variants) {
        const root = document.documentElement;
        
        root.style.setProperty('--player-base', variants.base);
        root.style.setProperty('--player-light', variants.light);
        root.style.setProperty('--player-lighter', variants.lighter);
        root.style.setProperty('--player-neutral', variants.neutral);
        root.style.setProperty('--player-muted', variants.muted);
        root.style.setProperty('--player-subtle', variants.subtle);
        root.style.setProperty('--player-medium', variants.medium);
        root.style.setProperty('--player-strong', variants.strong);
        root.style.setProperty('--player-dark', variants.dark);
        root.style.setProperty('--player-darker', variants.darker);
        root.style.setProperty('--player-accent', variants.accent);
        root.style.setProperty('--player-primary', variants.primary);
    }
    
    updateLyricsDefaultColor(variants) {
        // Calculate lyrics color using formula: -126, -129, -127 from base color
        const baseRgb = ColorHelper.hexToRgb(variants.base);
        const defaultLyricsColor = ColorHelper.addRgbOffset(baseRgb, -126, -129, -127);
        
        // Only update if this is the first time or if lyrics color hasn't been manually changed
        if (!this.lyricsColorManuallySet) {
            // Set flag to prevent duplicate emissions during theme update
            if (window.lyricsColorManager) {
                window.lyricsColorManager.isThemeUpdating = true;
            }
            // Update lyrics color manager if it exists (silently to avoid duplicate events)
            if (window.lyricsColorManager) {
                window.lyricsColorManager.setCurrentColorSilently(defaultLyricsColor);
            }
            
            // Update the color picker value
            const lyricsColorPicker = DOMHelper.getElementSilent('#lyrics-color-picker');
            const lyricsColorPreview = DOMHelper.getElementSilent('#color-preview-input');
            
            if (lyricsColorPicker) {
                lyricsColorPicker.value = defaultLyricsColor;
            }
            
            if (lyricsColorPreview) {
                lyricsColorPreview.value = defaultLyricsColor.toUpperCase();
                lyricsColorPreview.style.backgroundColor = defaultLyricsColor;
                lyricsColorPreview.style.color = this.getContrastColor(defaultLyricsColor);
            }
            
            // Clear flag after theme update
            if (window.lyricsColorManager) {
                window.lyricsColorManager.isThemeUpdating = false;
            }
        }
    }
    
    setLyricsColorManuallySet(manuallySet) {
        this.lyricsColorManuallySet = manuallySet;
    }
    
    getContrastColor(hexColor) {
        const rgb = ColorHelper.hexToRgb(hexColor);
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
