/**
 * Color Helper Utility
 * Provides common color manipulation functions to reduce code duplication
 */
class ColorHelper {
    /**
     * Convert hex color to RGB object
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /**
     * Convert RGB values to hex color
     */
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    /**
     * Add offset to RGB values and return hex
     */
    static addRgbOffset(rgb, rOffset, gOffset, bOffset) {
        const newR = Math.max(0, Math.min(255, rgb.r + rOffset));
        const newG = Math.max(0, Math.min(255, rgb.g + gOffset));
        const newB = Math.max(0, Math.min(255, rgb.b + bOffset));
        return this.rgbToHex(newR, newG, newB);
    }
    
    /**
     * Calculate all player color variants from base color
     * This is the single source of truth for color calculations
     */
    static calculatePlayerColorVariants(baseColor) {
        const base = baseColor || window.Constants?.PLAYER_BASE_COLOR || '#c8bda9';
        const baseRgb = this.hexToRgb(base);
        
        if (!baseRgb) {
            return { base: base };
        }
        
        return {
            base: base,
            light: this.addRgbOffset(baseRgb, 24, 27, 30),
            lighter: this.addRgbOffset(baseRgb, 28, 30, 31),
            neutral: this.addRgbOffset(baseRgb, 9, 8, 7),
            muted: this.addRgbOffset(baseRgb, -17, -18, -19),
            subtle: this.addRgbOffset(baseRgb, -20, -22, -22),
            medium: this.addRgbOffset(baseRgb, -83, -87, -87),
            strong: this.addRgbOffset(baseRgb, -78, -82, -81),
            dark: this.addRgbOffset(baseRgb, -105, -108, -102),
            darker: this.addRgbOffset(baseRgb, -62, -64, -62),
            accent: this.addRgbOffset(baseRgb, -60, -80, -100),
            primary: this.addRgbOffset(baseRgb, -90, -110, -130)
        };
    }

    /**
     * Calculate lyrics optimal color from base color
     */
    static calculateLyricsColor(baseColor) {
        const base = baseColor || window.Constants?.PLAYER_BASE_COLOR || '#c8bda9';
        const baseRgb = this.hexToRgb(base);
        
        if (!baseRgb) return base;
        
        return this.addRgbOffset(baseRgb, -131, -143, -139);
    }

    /**
     * Get player color by key (backward compatibility)
     */
    static getPlayerColor(colorKey, baseColor = null) {
        const base = baseColor || window.Constants?.PLAYER_BASE_COLOR || '#c8bda9';
        
        // Get color from CSS custom properties first
        const root = document.documentElement;
        const cssColor = getComputedStyle(root).getPropertyValue(`--player-${colorKey}`).trim();
        
        if (cssColor) {
            return cssColor;
        }
        
        // Fallback: calculate from base color using centralized method
        const variants = this.calculatePlayerColorVariants(base);
        return variants[colorKey] || base;
    }
    
    /**
     * Apply color to element
     */
    static applyColorToElement(element, colorKey, property = 'color') {
        if (!element) return;
        
        const color = this.getPlayerColor(colorKey);
        element.style[property] = color;
    }
    
    /**
     * Apply background color to element
     */
    static applyBackgroundColor(element, colorKey) {
        this.applyColorToElement(element, colorKey, 'background');
    }
    
    /**
     * Apply border color to element
     */
    static applyBorderColor(element, colorKey) {
        this.applyColorToElement(element, colorKey, 'borderColor');
    }
    
    /**
     * Get random color from predefined palette
     */
    static getRandomColor() {
        const colors = window.Constants?.COLORS?.BACKGROUND_GRADIENT?.COLORS || [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
            '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Generate gradient colors
     */
    static generateGradientColors(startColor, endColor, steps = 10) {
        const startRgb = this.hexToRgb(startColor);
        const endRgb = this.hexToRgb(endColor);
        
        if (!startRgb || !endRgb) return [startColor, endColor];
        
        const colors = [];
        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
            const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
            const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
            colors.push(this.rgbToHex(r, g, b));
        }
        
        return colors;
    }
    
    /**
     * Check if color is light or dark
     */
    static isLightColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return false;
        
        // Calculate luminance
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5;
    }
    
    /**
     * Get contrasting color (black or white)
     */
    static getContrastingColor(hex) {
        return this.isLightColor(hex) ? '#000000' : '#ffffff';
    }
    
    /**
     * Lighten color by percentage
     */
    static lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = percent / 100;
        const newR = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
        const newG = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
        const newB = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
        
        return this.rgbToHex(newR, newG, newB);
    }
    
    /**
     * Darken color by percentage
     */
    static darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = percent / 100;
        const newR = Math.max(0, Math.round(rgb.r * (1 - factor)));
        const newG = Math.max(0, Math.round(rgb.g * (1 - factor)));
        const newB = Math.max(0, Math.round(rgb.b * (1 - factor)));
        
        return this.rgbToHex(newR, newG, newB);
    }
    
    /**
     * Convert RGB to HSL
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    /**
     * Convert HSL to RGB
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorHelper;
}

window.ColorHelper = ColorHelper;
