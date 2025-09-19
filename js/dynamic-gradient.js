/**
 * Dynamic Background Gradient Generator
 * Generates random background gradients for body on each page load
 * Provides a variety of beautiful gradient combinations with smooth animations
 */
export class DynamicGradient {
    constructor() {
        this.gradientSets = this.initializeGradientSets();
        this.init();
    }

    /**
     * Initialize predefined gradient color sets
     * @returns {Array} Array of gradient color sets
     */
    initializeGradientSets() {
        return [
            // Warm color sets
            [
                ['#ff6b6b', '#ffa726', '#ffeb3b'],
                ['#ff9a9e', '#fecfef', '#fecfef'],
                ['#ff9a56', '#ff6b6b', '#c44569']
            ],
            // Cool color sets
            [
                ['#667eea', '#764ba2', '#f093fb'],
                ['#4facfe', '#00f2fe', '#43e97b'],
                ['#a8edea', '#fed6e3', '#d299c2']
            ],
            // Nature color sets
            [
                ['#11998e', '#38ef7d', '#56ab2f'],
                ['#134e5e', '#71b280', '#a8e6cf'],
                ['#2c3e50', '#3498db', '#2ecc71']
            ],
            // Purple/violet sets
            [
                ['#667eea', '#764ba2', '#f093fb'],
                ['#a8c0ff', '#3f2b96', '#c471f5'],
                ['#8360c3', '#2ebf91', '#f093fb']
            ],
            // Sunset/sunrise sets
            [
                ['#ffecd2', '#fcb69f', '#ff8a80'],
                ['#ffeaa7', '#fab1a0', '#e17055'],
                ['#fd79a8', '#fdcb6e', '#6c5ce7']
            ],
            // Ocean/water sets
            [
                ['#74b9ff', '#0984e3', '#6c5ce7'],
                ['#a29bfe', '#6c5ce7', '#fd79a8'],
                ['#00b894', '#00cec9', '#74b9ff']
            ],
            // Neon/vibrant sets
            [
                ['#ff006e', '#8338ec', '#3a86ff'],
                ['#06ffa5', '#3d5a80', '#ee6c4d'],
                ['#f72585', '#b5179e', '#7209b7']
            ],
            // Pastel sets
            [
                ['#ffecd2', '#fcb69f', '#ff8a80'],
                ['#a8edea', '#fed6e3', '#d299c2'],
                ['#ff9a9e', '#fecfef', '#fecfef']
            ]
        ];
    }

    /**
     * Initialize dynamic gradient system
     */
    init() {
        this.applyRandomGradient();
        this.addSmoothTransition();
    }

    /**
     * Generate a random hex color
     * @returns {string} Random hex color
     */
    generateRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    /**
     * Generate gradient from predefined color sets
     * @returns {Array} Array of colors for gradient
     */
    generateGradientFromSet() {
        const randomSet = this.gradientSets[Math.floor(Math.random() * this.gradientSets.length)];
        const randomGradient = randomSet[Math.floor(Math.random() * randomSet.length)];
        
        const additionalColors = [];
        for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) {
            additionalColors.push(this.generateRandomColor());
        }
        
        return [...randomGradient, ...additionalColors];
    }

    /**
     * Generate completely random gradient
     * @returns {Array} Array of random colors
     */
    generateRandomGradient() {
        const colorCount = Math.floor(Math.random() * 3) + 3;
        const colors = [];
        
        for (let i = 0; i < colorCount; i++) {
            colors.push(this.generateRandomColor());
        }
        
        return colors;
    }

    /**
     * Generate random gradient angle
     * @returns {string} Random gradient angle
     */
    generateRandomAngle() {
        const angles = [
            '45deg', '90deg', '135deg', '180deg', '225deg', '270deg', '315deg',
            'to right', 'to left', 'to top', 'to bottom',
            'to right top', 'to right bottom', 'to left top', 'to left bottom'
        ];
        
        return angles[Math.floor(Math.random() * angles.length)];
    }

    /**
     * Generate random color stops with blending effect
     * @param {Array} colors - Array of colors
     * @returns {string} Color stops string
     */
    generateRandomStops(colors) {
        const stops = [];
        const step = 100 / (colors.length - 1);
        
        colors.forEach((color, index) => {
            if (index === 0) {
                stops.push(`${color} 0%`);
            } else if (index === colors.length - 1) {
                stops.push(`${color} 100%`);
            } else {
                const basePosition = index * step;
                const variation = Math.random() * 10 - 5;
                const position = Math.max(0, Math.min(100, basePosition + variation));
                
                stops.push(`${color} ${position}%`);
                
                const fadeColor = this.addTransparency(color, 0.3);
                stops.push(`${fadeColor} ${position - 5}%`);
                stops.push(`${fadeColor} ${position + 5}%`);
            }
        });
        
        return stops.join(', ');
    }

    /**
     * Add transparency to a hex color
     * @param {string} color - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    addTransparency(color, alpha) {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    /**
     * Apply random gradient to body element
     */
    applyRandomGradient() {
        const usePreset = Math.random() > 0.3;
        const colors = usePreset ? this.generateGradientFromSet() : this.generateRandomGradient();
        
        const gradients = this.createBlendedGradients(colors);
        
        document.body.style.background = gradients;
        
        this.addGradientAnimation(gradients);
    }

    /**
     * Create multiple blended gradients for complex background
     * @param {Array} colors - Base colors for gradients
     * @returns {string} Combined gradient string
     */
    createBlendedGradients(colors) {
        const gradients = [];
        
        // Primary linear gradient
        const angle = this.generateRandomAngle();
        const stops = this.generateRandomStops(colors);
        gradients.push(`linear-gradient(${angle}, ${stops})`);
        
        // Radial gradient overlay
        const radialColors = this.createRadialColors(colors);
        const radialStops = this.generateRadialStops(radialColors);
        gradients.push(`radial-gradient(circle at ${this.generateRandomPosition()}, ${radialStops})`);
        
        // Secondary linear gradient
        const angle2 = this.generateRandomAngle();
        const colors2 = this.shiftColors(colors);
        const stops2 = this.generateRandomStops(colors2);
        gradients.push(`linear-gradient(${angle2}, ${stops2})`);
        
        return gradients.join(', ');
    }

    /**
     * Create colors for radial gradient with transparency
     * @param {Array} colors - Base colors
     * @returns {Array} Colors with transparency
     */
    createRadialColors(colors) {
        return colors.map(color => {
            return this.addTransparency(color, 0.4);
        });
    }

    /**
     * Generate stops for radial gradient
     * @param {Array} colors - Colors for radial gradient
     * @returns {string} Radial gradient stops
     */
    generateRadialStops(colors) {
        const stops = [];
        colors.forEach((color, index) => {
            const position = (index / (colors.length - 1)) * 100;
            stops.push(`${color} ${position}%`);
        });
        return stops.join(', ');
    }

    /**
     * Generate random position for radial gradient
     * @returns {string} Random position string
     */
    generateRandomPosition() {
        const positions = [
            'top left', 'top center', 'top right',
            'center left', 'center center', 'center right',
            'bottom left', 'bottom center', 'bottom right'
        ];
        return positions[Math.floor(Math.random() * positions.length)];
    }

    /**
     * Shift colors to create variations (increase brightness)
     * @param {Array} colors - Original colors
     * @returns {Array} Shifted colors
     */
    shiftColors(colors) {
        return colors.map(color => {
            if (color.startsWith('#')) {
                // Increase brightness slightly
                const hex = color.slice(1);
                const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 20);
                const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 20);
                const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 20);
                return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
            return color;
        });
    }

    /**
     * Add animation effect to gradient
     * @param {string} baseGradient - Base gradient string
     */
    addGradientAnimation(baseGradient) {
        const animationName = 'gradientBlend';
        const keyframes = `
            @keyframes ${animationName} {
                0% { 
                    background: ${baseGradient};
                }
                25% { 
                    background: ${this.createShiftedGradient(baseGradient, 0.1)};
                }
                50% { 
                    background: ${this.createShiftedGradient(baseGradient, 0.2)};
                }
                75% { 
                    background: ${this.createShiftedGradient(baseGradient, 0.1)};
                }
                100% { 
                    background: ${baseGradient};
                }
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = keyframes;
        document.head.appendChild(style);
        
        document.body.style.animation = `${animationName} 30s ease-in-out infinite`;
    }

    /**
     * Create gradient with brightness changes and blending effect
     * @param {string} baseGradient - Base gradient string
     * @param {number} shift - Brightness shift amount
     * @returns {string} Shifted gradient string
     */
    createShiftedGradient(baseGradient, shift) {
        const gradients = baseGradient.split(', ');
        const newGradients = gradients.map(gradient => {
            return gradient
                .replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/g, (match, r, g, b, a) => {
                    const newAlpha = Math.max(0.1, Math.min(1, parseFloat(a) + shift));
                    return `rgba(${r},${g},${b},${newAlpha})`;
                })
                .replace(/#([0-9a-fA-F]{6})/g, (match, hex) => {
                    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + shift * 50);
                    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + shift * 50);
                    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + shift * 50);
                    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                });
        });
        
        return newGradients.join(', ');
    }

    /**
     * Add smooth transition styles to body
     */
    addSmoothTransition() {
        const style = document.createElement('style');
        style.textContent = `
            body {
                transition: background 2s ease-in-out;
                background-attachment: fixed;
                background-size: 100% 100%;
                min-height: 100vh;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Initialize Dynamic Gradient when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    const gradientManager = new DynamicGradient();
});
