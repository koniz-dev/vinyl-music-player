/**
 * Tonearm Renderer
 * Handles tonearm rendering
 */
export class TonearmRenderer {
    /**
     * Render tonearm
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} vinylLayout - Vinyl layout information
     */
    render(ctx, vinylLayout) {
        const { centerX, centerY, vinylRadius, vinylContainerX, vinylContainerY, vinylContainerWidth, vinylContainerHeight } = vinylLayout;

        // Draw tonearm after album art (exact match with CSS .tonearm)
        // position: absolute; top: 16px; right: 16px; width: 3px; height: 96px;
        // background: linear-gradient(to bottom, #fff, #ccc); transform: rotate(25deg);
        // Calculate tonearm position to match CSS: top: 16px; right: 16px from vinyl container
        const tonearmX = vinylContainerX + vinylContainerWidth - 16; // right: 16px from container
        const tonearmY = vinylContainerY + 16; // top: 16px from container
        const tonearmLength = 96; // height: 96px as per CSS
        
        ctx.save();
        ctx.translate(tonearmX, tonearmY);
        ctx.rotate(25 * Math.PI / 180); // 25 degrees like CSS
        
        // Draw tonearm as one seamless piece
        // First, draw the main tonearm body with gradient
        const tonearmGradient = ctx.createLinearGradient(0, 0, 0, tonearmLength);
        tonearmGradient.addColorStop(0, '#fff');
        tonearmGradient.addColorStop(1, '#ccc');
        
        ctx.fillStyle = tonearmGradient;
        ctx.fillRect(-1.5, 0, 3, tonearmLength);
        
        // Draw pivot as part of tonearm body (seamless connection)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-1.5, 0, 5, 0, 2 * Math.PI); // Connected to tonearm body
        ctx.fill();
        
        // Draw needle as part of tonearm body (seamless connection)
        ctx.fillStyle = '#666';
        ctx.fillRect(-2, tonearmLength - 5, 6, 10); // Connected to tonearm body
        
        ctx.restore();
    }
}
