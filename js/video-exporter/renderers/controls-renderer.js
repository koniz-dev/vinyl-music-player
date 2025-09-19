/**
 * Controls Renderer
 * Handles control buttons rendering
 */
export class ControlsRenderer {
    /**
     * Render control buttons
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} layout - Main layout information
     * @param {Object} progressLayout - Progress layout information
     * @param {HTMLAudioElement} audio - Audio element
     */
    render(ctx, layout, progressLayout, audio) {
        const { musicPlayerX, musicPlayerWidth } = layout;
        const { progressContainerY, progressContainerHeight } = progressLayout;

        // Create controls (exact match with CSS .controls)
        // display: flex; justify-content: space-around; align-items: center; padding: 10px 30px 30px;
        const controlsWidth = musicPlayerWidth;
        const controlsHeight = 80;
        const controlsX = musicPlayerX;
        const controlsY = progressContainerY + progressContainerHeight - 20; // Lower controls by 20px
        
        // Control buttons with equal spacing
        // display: flex; justify-content: space-around; align-items: center; padding: 10px 30px 30px;
        const buttonSize = 45; // Smaller buttons to fit better
        const playButtonSize = 70; // Play button is larger
        const availableWidth = controlsWidth - 60; // Available space minus padding (30px each side)
        
        // Calculate spacing for equal distribution
        // We have 4 regular buttons (45px each) + 1 play button (70px) = 250px total button width
        const totalButtonWidth = 4 * buttonSize + playButtonSize; // 4 regular + 1 play button
        const totalSpacing = availableWidth - totalButtonWidth; // Remaining space for spacing
        const buttonSpacing = totalSpacing / 4; // Equal spacing between buttons
        const startButtonX = controlsX + 30; // padding-left: 30px
        
        // Center buttons vertically within controls area
        const buttonY = controlsY + (controlsHeight - playButtonSize) / 2; // Center the largest button
        
        // Control button icons (exact match with HTML)
        // Play button should show pause icon when playing
        const playIcon = (audio && !audio.paused) ? '⏸' : '▶';
        const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];
        
        // Control buttons (exact match with CSS .control-btn)
        let currentX = startButtonX;
        
        for (let i = 0; i < 5; i++) {
            // Special styling for play button (exact match with CSS .vinyl-play-pause-btn)
            if (i === 2) { // Play button is at index 2
                // width: 70px !important; height: 70px !important; font-size: 28px !important; background: rgba(255, 255, 255, 0.15) !important;
                const playButtonX = currentX + playButtonSize/2;
                const playButtonYCenter = buttonY + playButtonSize/2;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.arc(playButtonX, playButtonYCenter, playButtonSize/2, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = `28px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(buttonIcons[i], playButtonX, playButtonYCenter);
                
                // Move to next position
                currentX += playButtonSize + buttonSpacing;
            } else {
                // Regular button styling - center them with the play button
                // background: rgba(255, 255, 255, 0.1)
                const buttonX = currentX + buttonSize/2;
                const buttonYCenter = buttonY + playButtonSize/2; // Align with play button center
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = `${buttonSize * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(buttonIcons[i], buttonX, buttonYCenter);
                
                // Move to next position
                currentX += buttonSize + buttonSpacing;
            }
        }
    }
}
