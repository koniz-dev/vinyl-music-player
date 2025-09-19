/**
 * Background Renderer
 * Handles background and container rendering
 */
export class BackgroundRenderer {
    /**
     * Render background and containers
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} dimensions - Canvas dimensions
     */
    render(ctx, dimensions) {
        const { width, height } = dimensions;

        // Create body background gradient (exact match with CSS)
        // background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)
        const bodyGradient = ctx.createLinearGradient(0, 0, width, height);
        bodyGradient.addColorStop(0, '#667eea'); // 0%
        bodyGradient.addColorStop(0.25, '#764ba2'); // 25%
        bodyGradient.addColorStop(0.5, '#f093fb'); // 50%
        bodyGradient.addColorStop(0.75, '#f5576c'); // 75%
        bodyGradient.addColorStop(1, '#4facfe'); // 100%
        
        // Fill with body gradient background
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(0, 0, width, height);
    
        // Create right panel (exact match with CSS .right-panel)
        // background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2)
        const rightPanelWidth = width;
        const rightPanelHeight = height;
        const rightPanelX = 0;
        const rightPanelY = 0;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(rightPanelX, rightPanelY, rightPanelWidth, rightPanelHeight);
        
        // Create vinyl player container (exact match with CSS .player-container)
        // width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        const vinylPlayerContainerWidth = rightPanelWidth;
        const vinylPlayerContainerHeight = rightPanelHeight;
        const vinylPlayerContainerX = rightPanelX;
        const vinylPlayerContainerY = rightPanelY;
        
        // Create music player (exact match with CSS .music-player)
        // width: 350px; height: 600px; background: rgba(0, 0, 0, 0.4); border-radius: 30px;
        const musicPlayerWidth = Math.min(width * 0.9, 350);
        const musicPlayerHeight = Math.min(height * 0.9, 600);
        const musicPlayerX = vinylPlayerContainerX + (vinylPlayerContainerWidth - musicPlayerWidth) / 2;
        const musicPlayerY = vinylPlayerContainerY + (vinylPlayerContainerHeight - musicPlayerHeight) / 2;
        
        // Add rounded corners effect (like CSS border-radius: 30px)
        ctx.save();
        ctx.beginPath();
        const radius = 30;
        ctx.moveTo(musicPlayerX + radius, musicPlayerY);
        ctx.lineTo(musicPlayerX + musicPlayerWidth - radius, musicPlayerY);
        ctx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY, musicPlayerX + musicPlayerWidth, musicPlayerY + radius);
        ctx.lineTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight - radius);
        ctx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight, musicPlayerX + musicPlayerWidth - radius, musicPlayerY + musicPlayerHeight);
        ctx.lineTo(musicPlayerX + radius, musicPlayerY + musicPlayerHeight);
        ctx.quadraticCurveTo(musicPlayerX, musicPlayerY + musicPlayerHeight, musicPlayerX, musicPlayerY + musicPlayerHeight - radius);
        ctx.lineTo(musicPlayerX, musicPlayerY + radius);
        ctx.quadraticCurveTo(musicPlayerX, musicPlayerY, musicPlayerX + radius, musicPlayerY);
        ctx.clip();
        
        // Music player background (exact match with CSS)
        // background: rgba(0, 0, 0, 0.4) - removed shadow effects
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
        
        ctx.restore();

        return {
            musicPlayerX,
            musicPlayerY,
            musicPlayerWidth,
            musicPlayerHeight,
            vinylPlayerContainerX,
            vinylPlayerContainerY,
            vinylPlayerContainerWidth,
            vinylPlayerContainerHeight
        };
    }
}
