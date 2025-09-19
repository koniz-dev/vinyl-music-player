/**
 * Album Art Renderer
 * Handles album art rendering in vinyl center
 */
export class AlbumArtRenderer {
    /**
     * Render album art
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} vinylLayout - Vinyl layout information
     * @param {Object} layout - Main layout information
     * @param {HTMLImageElement} albumArtImage - Album art image
     * @param {number} vinylRotation - Current vinyl rotation
     */
    render(ctx, vinylLayout, layout, albumArtImage, vinylRotation) {
        const { centerX, centerY, vinylRadius } = vinylLayout;
        const { musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight } = layout;

        // Draw album art background if available (exact match with CSS - no blur effects)
        if (albumArtImage) {
            // Calculate proper scaling to cover entire music player area
            const imgAspect = albumArtImage.width / albumArtImage.height;
            const playerAspect = musicPlayerWidth / musicPlayerHeight;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > playerAspect) {
                drawHeight = musicPlayerHeight;
                drawWidth = drawHeight * imgAspect;
                offsetX = musicPlayerX + (musicPlayerWidth - drawWidth) / 2;
                offsetY = musicPlayerY;
            } else {
                drawWidth = musicPlayerWidth;
                drawHeight = drawWidth / imgAspect;
                offsetX = musicPlayerX;
                offsetY = musicPlayerY + (musicPlayerHeight - drawHeight) / 2;
            }
            
            ctx.drawImage(albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Vinyl center with CSS styling (like CSS .vinyl-center)
        const centerRadius = vinylRadius * 0.48; // 96px for 200px vinyl (like CSS width: 96px)
        
        // Vinyl center background (exact match with CSS)
        // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
        const centerGradient = ctx.createLinearGradient(centerX - centerRadius, centerY - centerRadius, centerX + centerRadius, centerY + centerRadius);
        centerGradient.addColorStop(0, '#667eea'); // 0%
        centerGradient.addColorStop(1, '#764ba2'); // 100%
        
        // Vinyl center - removed shadow effects
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add glassmorphism highlight to center
        const centerHighlight = ctx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0, centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8);
        centerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        centerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        centerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = centerHighlight;
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Album art with exact CSS styling (like CSS .album-art)
        const albumArtRadius = centerRadius * 0.83; // 100px for 120px center (like CSS width: 100px)
        if (albumArtImage) {
            // Album art - exact match with CSS: width: 100px; height: 100px; border-radius: 50%; object-fit: cover;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            ctx.clip();
            
            // Apply vinyl rotation to album art (rotate with vinyl)
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((vinylRotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
            
            // Draw album art with rotation
            ctx.drawImage(albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                          albumArtRadius * 2, albumArtRadius * 2);
            
            ctx.restore();
            ctx.restore();
        } else {
            // Default album art placeholder with custom SVG image (like CSS background)
            const customSvgImage = new Image();
            customSvgImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)"/><path d="M30 40 Q35 35 40 40 L45 50 Q50 45 55 50 L60 60 Q55 65 50 60 L45 50 Q40 55 35 50 Z" fill="white" opacity="0.8"/></svg>';
            
            // Apply vinyl rotation to custom SVG image (rotate with vinyl)
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((vinylRotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);
            
            // Draw custom SVG image with rotation
            ctx.drawImage(customSvgImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                          albumArtRadius * 2, albumArtRadius * 2);
            
            ctx.restore();
        }
    }
}
