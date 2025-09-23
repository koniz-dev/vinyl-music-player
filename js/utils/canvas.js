/**
 * Canvas Drawing Utilities
 * Centralized functions to avoid code duplication in canvas drawing
 */
class CanvasUtils {
    static constants = window.Constants;
    static cachedGradient = null;

    /**
     * Create background gradient with multiple colors
     */
    static createBackgroundGradient(ctx, width, height) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        
        // Get colors from constants
        const colors = this.constants?.COLORS.BACKGROUND_GRADIENT.COLORS || ['#667eea', '#f093fb', '#f5576c'];
        
        // Add color stops evenly distributed
        colors.forEach((color, index) => {
            const position = index / (colors.length - 1);
            gradient.addColorStop(position, color);
        });
        
        return gradient;
    }

    /**
     * Create random background gradient with multiple colors
     */
    static createRandomBackgroundGradient(ctx, width, height) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        
        // Get colors from constants
        const allColors = this.constants?.COLORS.BACKGROUND_GRADIENT.COLORS || ['#667eea', '#f093fb', '#f5576c'];
        
        // Randomly select 4-6 colors
        const numColors = Math.floor(Math.random() * 3) + 4; // 4-6 colors
        const selectedColors = [];
        
        for (let i = 0; i < numColors; i++) {
            const randomIndex = Math.floor(Math.random() * allColors.length);
            selectedColors.push(allColors[randomIndex]);
        }
        
        // Add color stops
        selectedColors.forEach((color, index) => {
            const position = index / (selectedColors.length - 1);
            gradient.addColorStop(position, color);
        });
        
        return gradient;
    }

    /**
     * Reset cached gradient to generate new random colors
     */
    static resetBackgroundGradient() {
        this.cachedGradient = null;
    }

    /**
     * Draw background with gradient and overlay
     */
    static drawBackground(ctx, width, height) {
        // Create gradient only once and cache it
        if (!this.cachedGradient) {
            this.cachedGradient = this.createRandomBackgroundGradient(ctx, width, height);
        }
        
        // Background gradient
        ctx.fillStyle = this.cachedGradient;
        ctx.fillRect(0, 0, width, height);
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, width, height);
    }

    /**
     * Create vinyl center gradient
     */
    static createVinylCenterGradient(ctx, centerX, centerY, centerRadius) {
        const gradient = ctx.createLinearGradient(
            centerX - centerRadius, centerY - centerRadius, 
            centerX + centerRadius, centerY + centerRadius
        );
        gradient.addColorStop(0, this.constants?.COLORS.VINYL.CENTER_START || '#667eea');
        gradient.addColorStop(1, this.constants?.COLORS.VINYL.CENTER_END || '#764ba2');
        return gradient;
    }

    /**
     * Create vinyl disc gradient
     */
    static createVinylGradient(ctx, centerX, centerY, vinylRadius) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
        gradient.addColorStop(0, '#2a2a2a');
        gradient.addColorStop(0.2, '#2a2a2a');
        gradient.addColorStop(0.4, '#1a1a1a');
        gradient.addColorStop(0.8, '#000000');
        gradient.addColorStop(1, '#000000');
        return gradient;
    }

    /**
     * Create vinyl center highlight
     */
    static createVinylCenterHighlight(ctx, centerX, centerY, centerRadius) {
        const gradient = ctx.createRadialGradient(
            centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0,
            centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        return gradient;
    }

    /**
     * Create tonearm gradient
     */
    static createTonearmGradient(ctx, tonearmLength) {
        const gradient = ctx.createLinearGradient(0, 0, 0, tonearmLength);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ccc');
        return gradient;
    }

    /**
     * Create progress bar gradient
     */
    static createProgressGradient(ctx, progressBarX, progressBarY, progressWidth) {
        const gradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
        gradient.addColorStop(0, this.constants?.COLORS.VINYL.CENTER_START || '#667eea');
        gradient.addColorStop(1, this.constants?.COLORS.VINYL.CENTER_END || '#764ba2');
        return gradient;
    }

    /**
     * Create speaker grille gradient
     */
    static createGrilleGradient(ctx, grilleY, grilleHeight) {
        const gradient = ctx.createLinearGradient(0, grilleY, 0, grilleY + grilleHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        return gradient;
    }

    /**
     * Create fallback album art gradient
     */
    static createFallbackAlbumArtGradient(ctx, centerX, centerY, albumArtRadius) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, albumArtRadius);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        return gradient;
    }

    /**
     * Draw rounded rectangle
     */
    static drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Draw vinyl grooves
     */
    static drawVinylGrooves(ctx, centerX, centerY, vinylRadius) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const grooveRadii = [vinylRadius * 0.8, vinylRadius * 0.68, vinylRadius * 0.56];
        
        grooveRadii.forEach(radius => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }

    /**
     * Draw vinyl center
     */
    static drawVinylCenter(ctx, centerX, centerY, vinylRadius) {
        const centerRadius = vinylRadius * (this.constants?.DIMENSIONS.VINYL.CENTER_RADIUS_RATIO || 0.48);
        
        // Center gradient
        const centerGradient = this.createVinylCenterGradient(ctx, centerX, centerY, centerRadius);
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add highlight
        const centerHighlight = this.createVinylCenterHighlight(ctx, centerX, centerY, centerRadius);
        ctx.fillStyle = centerHighlight;
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        ctx.fill();
    }

    /**
     * Draw vinyl album art
     */
    static drawVinylAlbumArt(ctx, centerX, centerY, vinylRadius, albumArtImage) {
        const albumArtRadius = vinylRadius * (this.constants?.DIMENSIONS.VINYL.CENTER_RADIUS_RATIO || 0.48) * (this.constants?.DIMENSIONS.VINYL.ALBUM_ART_RADIUS_RATIO || 0.83);
        
        if (albumArtImage) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            ctx.clip();
            
            ctx.drawImage(albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, albumArtRadius * 2, albumArtRadius * 2);
            ctx.restore();
        } else {
            // Fallback gradient
            const gradient = this.createFallbackAlbumArtGradient(ctx, centerX, centerY, albumArtRadius);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    /**
     * Draw tonearm
     */
    static drawTonearm(ctx, tonearmX, tonearmY, tonearmLength, tonearmAngle) {
        ctx.save();
        ctx.translate(tonearmX, tonearmY);
        ctx.rotate((tonearmAngle || this.constants?.DIMENSIONS.CONTROLS.TONEARM_ANGLE || 25) * Math.PI / 180);
        
        const tonearmGradient = this.createTonearmGradient(ctx, tonearmLength);
        ctx.fillStyle = tonearmGradient;
        ctx.fillRect(-1.5, 0, 3, tonearmLength);
        
        // Draw tonearm base
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-1.5, 0, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw tonearm tip
        ctx.fillStyle = '#666';
        ctx.fillRect(-2, tonearmLength - 5, 6, 10);
        
        ctx.restore();
    }

    /**
     * Draw speaker grille
     */
    static drawSpeakerGrille(ctx, x, y, width, height, grilleY, grilleHeight) {
        const gradient = this.createGrilleGradient(ctx, grilleY, grilleHeight);
        ctx.fillStyle = gradient;
        
        this.drawRoundedRect(ctx, x, y, width, height, 8);
        ctx.fill();
    }

    /**
     * Draw progress bar with gradient
     */
    static drawProgressBar(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, progressPercent) {
        // Draw progress bar background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.save();
        this.drawRoundedRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 2);
        ctx.fill();
        ctx.restore();
        
        // Draw progress
        const progressWidth = progressBarWidth * progressPercent;
        const progressGradient = this.createProgressGradient(ctx, progressBarX, progressBarY, progressWidth);
        
        ctx.fillStyle = progressGradient;
        ctx.save();
        this.drawRoundedRect(ctx, progressBarX, progressBarY, progressWidth, progressBarHeight, 2);
        ctx.fill();
        ctx.restore();
        
        // Draw progress thumb
        const thumbX = progressBarX + progressWidth;
        const thumbY = progressBarY + progressBarHeight / 2;
        const thumbRadius = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        ctx.fill();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasUtils;
}

window.CanvasUtils = CanvasUtils;
