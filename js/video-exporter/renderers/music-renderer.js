/**
 * Music Renderer
 * Handles music record rendering with rotation and grooves
 */
export class MusicRenderer {
    constructor() {
        this.musicRotation = 0;
    }

    /**
     * Update vinyl rotation
     */
    updateRotation() {
        // Update vinyl rotation (slower, more natural vinyl rotation)
        // Always rotate during export regardless of audio state
        this.musicRotation += 0.3;
    }

    /**
     * Render vinyl record
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} layout - Layout information
     */
    render(ctx, layout) {
        const { musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight } = layout;

        // Create vinyl section (exact match with CSS .vinyl-section)
        // flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        const vinylSectionWidth = musicPlayerWidth;
        const vinylSectionHeight = musicPlayerHeight * 0.7; // flex: 1 takes most space
        const vinylSectionX = musicPlayerX;
        const vinylSectionY = musicPlayerY;
        
        // Create vinyl container (exact match with CSS .vinyl-container)
        // position: relative; width: 200px; height: 200px; margin-bottom: 30px;
        const vinylContainerWidth = 200;
        const vinylContainerHeight = 200;
        const vinylContainerX = vinylSectionX + (vinylSectionWidth - vinylContainerWidth) / 2;
        const vinylContainerY = vinylSectionY + (vinylSectionHeight - vinylContainerHeight) / 2 - 20; // Better centered positioning
        
        // Draw vinyl record (centered within vinyl container) - matching CSS exactly
        const centerX = vinylContainerX + vinylContainerWidth / 2;
        const centerY = vinylContainerY + vinylContainerHeight / 2;
        const vinylRadius = vinylContainerWidth / 2; // 200px / 2 = 100px

        // Vinyl record (exact match with CSS .vinyl-record)
        // background: radial-gradient(circle at center, #2a2a2a 20%, #1a1a1a 40%, #000 80%)
        // with silver highlights for 3D effect
        
        // Apply vinyl rotation (always rotate during export)
        // Animation is added via JS when playing: vinyl.style.animation = 'spin 8s linear infinite'
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((this.musicRotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        
        const vinylGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
        vinylGradient.addColorStop(0, '#2a2a2a');
        vinylGradient.addColorStop(0.2, '#2a2a2a');
        vinylGradient.addColorStop(0.4, '#1a1a1a');
        vinylGradient.addColorStop(0.8, '#000000');
        vinylGradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = vinylGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
        
        // Draw vinyl grooves (exact match with CSS .vinyl-grooves)
        // border: 1px solid rgba(255, 255, 255, 0.1)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Apply same rotation to grooves (always rotate during export)
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((this.musicRotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        
        // Groove 1: width: 200px; height: 200px; top: 25px; left: 25px;
        const groove1Radius = vinylRadius * 0.8;
        ctx.beginPath();
        ctx.arc(centerX, centerY, groove1Radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Groove 2: width: 170px; height: 170px; top: 40px; left: 40px;
        const groove2Radius = vinylRadius * 0.68;
        ctx.beginPath();
        ctx.arc(centerX, centerY, groove2Radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Groove 3: width: 140px; height: 140px; top: 55px; left: 55px;
        const groove3Radius = vinylRadius * 0.56;
        ctx.beginPath();
        ctx.arc(centerX, centerY, groove3Radius, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();

        return {
            centerX,
            centerY,
            vinylRadius,
            vinylContainerX,
            vinylContainerY,
            vinylContainerWidth,
            vinylContainerHeight
        };
    }
}
