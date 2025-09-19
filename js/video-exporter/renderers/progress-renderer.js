/**
 * Progress Renderer
 * Handles progress bar and time display rendering
 */
import { formatTime } from '../utils.js';

export class ProgressRenderer {
    /**
     * Render progress bar and time labels
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} layout - Main layout information
     * @param {Object} songInfoLayout - Song info layout information
     * @param {HTMLAudioElement} audio - Audio element
     */
    render(ctx, layout, songInfoLayout, audio) {
        const { musicPlayerX, musicPlayerWidth } = layout;
        const { songInfoY, songInfoHeight } = songInfoLayout;

        // Create progress container (exact match with CSS .progress-container)
        // width: 100%; padding: 0 30px;
        const progressContainerWidth = musicPlayerWidth;
        const progressContainerHeight = 50;
        const progressContainerX = musicPlayerX;
        const progressContainerY = songInfoY + 80; // Position below lyrics (raised 40px)
        
        // Draw progress bar (exact match with CSS .progress-bar)
        // width: 100%; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px;
        const progressBarWidth = progressContainerWidth - 60; // padding: 0 30px
        const progressBarHeight = 4; // Original height
        const progressBarX = progressContainerX + 30; // padding-left: 30px
        const progressBarY = progressContainerY + 10;
        
        // Progress bar background with better border-radius
        // background: rgba(255, 255, 255, 0.2); border-radius: 2px;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.save();
        ctx.beginPath();
        const bgRadius = 2; // Original border-radius matching height
        ctx.moveTo(progressBarX + bgRadius, progressBarY);
        ctx.lineTo(progressBarX + progressBarWidth - bgRadius, progressBarY);
        ctx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY, progressBarX + progressBarWidth, progressBarY + bgRadius);
        ctx.lineTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight - bgRadius);
        ctx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight, progressBarX + progressBarWidth - bgRadius, progressBarY + progressBarHeight);
        ctx.lineTo(progressBarX + bgRadius, progressBarY + progressBarHeight);
        ctx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - bgRadius);
        ctx.lineTo(progressBarX, progressBarY + bgRadius);
        ctx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + bgRadius, progressBarY);
        ctx.fill();
        ctx.restore();
        
        // Progress bar fill (exact match with CSS .progress)
        // background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px;
        let progressPercent = 0.0;
        if (audio && audio.readyState >= 2 && !isNaN(audio.currentTime) && !isNaN(audio.duration) && audio.duration > 0) {
            progressPercent = Math.min(audio.currentTime / audio.duration, 1.0);
        }
        const progressWidth = progressBarWidth * progressPercent;
        const progressGradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
        progressGradient.addColorStop(0, '#667eea');
        progressGradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = progressGradient;
        ctx.save();
        ctx.beginPath();
        const fillRadius = 2; // Original border-radius to match background
        ctx.moveTo(progressBarX + fillRadius, progressBarY);
        ctx.lineTo(progressBarX + progressWidth - fillRadius, progressBarY);
        ctx.quadraticCurveTo(progressBarX + progressWidth, progressBarY, progressBarX + progressWidth, progressBarY + fillRadius);
        ctx.lineTo(progressBarX + progressWidth, progressBarY + progressBarHeight - fillRadius);
        ctx.quadraticCurveTo(progressBarX + progressWidth, progressBarY + progressBarHeight, progressBarX + progressWidth - fillRadius, progressBarY + progressBarHeight);
        ctx.lineTo(progressBarX + fillRadius, progressBarY + progressBarHeight);
        ctx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - fillRadius);
        ctx.lineTo(progressBarX, progressBarY + fillRadius);
        ctx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + fillRadius, progressBarY);
        ctx.fill();
        ctx.restore();
        
        // Scrubber thumb (CSS doesn't show thumb, but we'll add a subtle one)
        const thumbX = progressBarX + progressWidth;
        const thumbY = progressBarY + progressBarHeight / 2;
        const thumbRadius = 4; // Smaller thumb
        
        // Thumb body (no shadow, subtle)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Time labels (exact match with CSS .progress-time)
        // display: flex; justify-content: space-between; color: rgba(255, 255, 255, 0.7); font-size: 12px; margin-top: 8px;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `12px 'Patrick Hand', Arial, sans-serif`;
        ctx.textAlign = 'left';
        
        // Current time (dynamic if audio is available)
        const currentTime = audio && !isNaN(audio.currentTime) ? audio.currentTime : 0;
        const totalTime = audio && !isNaN(audio.duration) ? audio.duration : 0;
        
        ctx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
        
        ctx.textAlign = 'right';
        ctx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);

        return {
            progressContainerY,
            progressContainerHeight
        };
    }
}
