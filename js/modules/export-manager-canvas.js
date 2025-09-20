/**
 * Export Manager Canvas Rendering
 * Canvas-based rendering for video export functionality
 */
class ExportManagerCanvas {
    /**
     * Render frame to canvas (corrected version)
     */
    static renderToCanvas(exportCtx, exportCanvas, vinylRotation, albumArtImage, exportAudio, exportLyrics, exportLyricsColor) {
        if (!exportCtx) return;

        vinylRotation += 0.3;

        const bodyGradient = exportCtx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
        bodyGradient.addColorStop(0, '#667eea');
        bodyGradient.addColorStop(0.25, '#764ba2');
        bodyGradient.addColorStop(0.5, '#f093fb');
        bodyGradient.addColorStop(0.75, '#f5576c');
        bodyGradient.addColorStop(1, '#4facfe');
        exportCtx.fillStyle = bodyGradient;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        const rightPanelWidth = exportCanvas.width;
        const rightPanelHeight = exportCanvas.height;
        const rightPanelX = 0;
        const rightPanelY = 0;
        
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        exportCtx.fillRect(rightPanelX, rightPanelY, rightPanelWidth, rightPanelHeight);
        
        const vinylPlayerContainerWidth = rightPanelWidth;
        const vinylPlayerContainerHeight = rightPanelHeight;
        const vinylPlayerContainerX = rightPanelX;
        const vinylPlayerContainerY = rightPanelY;
        
        const musicPlayerWidth = Math.min(exportCanvas.width * 0.9, 350);
        const musicPlayerHeight = Math.min(exportCanvas.height * 0.9, 600);
        const musicPlayerX = vinylPlayerContainerX + (vinylPlayerContainerWidth - musicPlayerWidth) / 2;
        const musicPlayerY = vinylPlayerContainerY + (vinylPlayerContainerHeight - musicPlayerHeight) / 2;
        exportCtx.save();
        exportCtx.beginPath();
        const radius = 30;
        exportCtx.moveTo(musicPlayerX + radius, musicPlayerY);
        exportCtx.lineTo(musicPlayerX + musicPlayerWidth - radius, musicPlayerY);
        exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY, musicPlayerX + musicPlayerWidth, musicPlayerY + radius);
        exportCtx.lineTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight - radius);
        exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight, musicPlayerX + musicPlayerWidth - radius, musicPlayerY + musicPlayerHeight);
        exportCtx.lineTo(musicPlayerX + radius, musicPlayerY + musicPlayerHeight);
        exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY + musicPlayerHeight, musicPlayerX, musicPlayerY + musicPlayerHeight - radius);
        exportCtx.lineTo(musicPlayerX, musicPlayerY + radius);
        exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY, musicPlayerX + radius, musicPlayerY);
        exportCtx.clip();
        
        if (albumArtImage) {
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
            
            exportCtx.drawImage(albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
        }
        
        exportCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        exportCtx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
        
        exportCtx.restore();

        const vinylSectionWidth = musicPlayerWidth;
        const vinylSectionHeight = musicPlayerHeight * 0.7;
        const vinylSectionX = musicPlayerX;
        const vinylSectionY = musicPlayerY;
        
        const vinylContainerWidth = 200;
        const vinylContainerHeight = 200;
        const vinylContainerX = vinylSectionX + (vinylSectionWidth - vinylContainerWidth) / 2;
        const vinylContainerY = vinylSectionY + (vinylSectionHeight - vinylContainerHeight) / 2 - 20;
        
        const centerX = vinylContainerX + vinylContainerWidth / 2;
        const centerY = vinylContainerY + vinylContainerHeight / 2;
        const vinylRadius = vinylContainerWidth / 2;

        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((vinylRotation * Math.PI) / 180);
        exportCtx.translate(-centerX, -centerY);
        
        const vinylGradient = exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
        vinylGradient.addColorStop(0, '#2a2a2a');
        vinylGradient.addColorStop(0.2, '#2a2a2a');
        vinylGradient.addColorStop(0.4, '#1a1a1a');
        vinylGradient.addColorStop(0.8, '#000000');
        vinylGradient.addColorStop(1, '#000000');
        
        exportCtx.fillStyle = vinylGradient;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        exportCtx.restore();
        
        exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        exportCtx.lineWidth = 1;
        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((vinylRotation * Math.PI) / 180);
        exportCtx.translate(-centerX, -centerY);
        
        const groove1Radius = vinylRadius * 0.8;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, groove1Radius, 0, 2 * Math.PI);
        exportCtx.stroke();
        
        const groove2Radius = vinylRadius * 0.68;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, groove2Radius, 0, 2 * Math.PI);
        exportCtx.stroke();
        
        const groove3Radius = vinylRadius * 0.56;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, groove3Radius, 0, 2 * Math.PI);
        exportCtx.stroke();
        
        exportCtx.restore();

        const centerRadius = vinylRadius * 0.48;
        
        const centerGradient = exportCtx.createLinearGradient(centerX - centerRadius, centerY - centerRadius, centerX + centerRadius, centerY + centerRadius);
        centerGradient.addColorStop(0, '#667eea');
        centerGradient.addColorStop(1, '#764ba2');
        
        exportCtx.fillStyle = centerGradient;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        const centerHighlight = exportCtx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0, centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8);
        centerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        centerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        centerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        exportCtx.fillStyle = centerHighlight;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        const albumArtRadius = centerRadius * 0.83;
        if (albumArtImage) {
            exportCtx.save();
            exportCtx.beginPath();
            exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            exportCtx.clip();
            exportCtx.save();
            exportCtx.translate(centerX, centerY);
            exportCtx.rotate((vinylRotation * Math.PI) / 180);
            exportCtx.translate(-centerX, -centerY);
            
            exportCtx.drawImage(albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                              albumArtRadius * 2, albumArtRadius * 2);
            
            exportCtx.restore();
            exportCtx.restore();
        } else {
            const customSvgImage = new Image();
            customSvgImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)"/><path d="M30 40 Q35 35 40 40 L45 50 Q50 45 55 50 L60 60 Q55 65 50 60 L45 50 Q40 55 35 50 Z" fill="white" opacity="0.8"/></svg>';
            exportCtx.save();
            exportCtx.translate(centerX, centerY);
            exportCtx.rotate((vinylRotation * Math.PI) / 180);
            exportCtx.translate(-centerX, -centerY);
            
            exportCtx.drawImage(customSvgImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                              albumArtRadius * 2, albumArtRadius * 2);
            
            exportCtx.restore();
        }

        const tonearmX = vinylContainerX + vinylContainerWidth - 16;
        const tonearmY = vinylContainerY + 16;
        const tonearmLength = 96;
        
        exportCtx.save();
        exportCtx.translate(tonearmX, tonearmY);
        exportCtx.rotate(25 * Math.PI / 180);
        const tonearmGradient = exportCtx.createLinearGradient(0, 0, 0, tonearmLength);
        tonearmGradient.addColorStop(0, '#fff');
        tonearmGradient.addColorStop(1, '#ccc');
        
        exportCtx.fillStyle = tonearmGradient;
        exportCtx.fillRect(-1.5, 0, 3, tonearmLength);
        
        exportCtx.fillStyle = '#fff';
        exportCtx.beginPath();
        exportCtx.arc(-1.5, 0, 5, 0, 2 * Math.PI);
        exportCtx.fill();
        
        exportCtx.fillStyle = '#666';
        exportCtx.fillRect(-2, tonearmLength - 5, 6, 10);
        
        exportCtx.restore();

        const songInfoX = vinylSectionX;
        const songInfoY = vinylContainerY + vinylContainerHeight + 40;
        const songInfoWidth = vinylSectionWidth;
        const songInfoHeight = 100;
        
        const songTitle = document.querySelector('.song-title')?.textContent || '';
        const artistName = document.querySelector('.artist-name')?.textContent || '';
        const lyricsText = document.querySelector('.vinyl-lyrics-text')?.textContent || '';

        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.textAlign = 'center';
        exportCtx.fillText(songTitle, songInfoX + songInfoWidth / 2, songInfoY);

        if (artistName) {
            exportCtx.font = `16px 'Patrick Hand', Arial, sans-serif`;
            exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            exportCtx.fillText(artistName, songInfoX + songInfoWidth / 2, songInfoY + 25);
        }

        if (exportAudio && exportLyrics.length > 0) {
            const currentTime = exportAudio.currentTime;
            const currentLyric = exportLyrics.find(lyric => 
                currentTime >= lyric.start && currentTime <= lyric.end
            );
            
            if (currentLyric) {
                exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`;
                exportCtx.fillStyle = exportLyricsColor;
                exportCtx.fillText(currentLyric.text, songInfoX + songInfoWidth / 2, songInfoY + 60);
            }
        } else if (lyricsText) {
            exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`;
            exportCtx.fillStyle = exportLyricsColor;
            exportCtx.fillText(lyricsText, songInfoX + songInfoWidth / 2, songInfoY + 60);
        }

        const progressContainerWidth = musicPlayerWidth;
        const progressContainerHeight = 50;
        const progressContainerX = musicPlayerX;
        const progressContainerY = songInfoY + 80;
        
        const progressBarWidth = progressContainerWidth - 60;
        const progressBarHeight = 4;
        const progressBarX = progressContainerX + 30;
        const progressBarY = progressContainerY + 10;
        
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        exportCtx.save();
        exportCtx.beginPath();
        const bgRadius = 2;
        exportCtx.moveTo(progressBarX + bgRadius, progressBarY);
        exportCtx.lineTo(progressBarX + progressBarWidth - bgRadius, progressBarY);
        exportCtx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY, progressBarX + progressBarWidth, progressBarY + bgRadius);
        exportCtx.lineTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight - bgRadius);
        exportCtx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight, progressBarX + progressBarWidth - bgRadius, progressBarY + progressBarHeight);
        exportCtx.lineTo(progressBarX + bgRadius, progressBarY + progressBarHeight);
        exportCtx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - bgRadius);
        exportCtx.lineTo(progressBarX, progressBarY + bgRadius);
        exportCtx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + bgRadius, progressBarY);
        exportCtx.fill();
        exportCtx.restore();
        
        let progressPercent = 0.0;
        if (exportAudio && exportAudio.readyState >= 2 && !isNaN(exportAudio.currentTime) && !isNaN(exportAudio.duration) && exportAudio.duration > 0) {
            progressPercent = Math.min(exportAudio.currentTime / exportAudio.duration, 1.0);
        }
        const progressWidth = progressBarWidth * progressPercent;
        const progressGradient = exportCtx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
        progressGradient.addColorStop(0, '#667eea');
        progressGradient.addColorStop(1, '#764ba2');
        
        exportCtx.fillStyle = progressGradient;
        exportCtx.save();
        exportCtx.beginPath();
        const fillRadius = 2;
        exportCtx.moveTo(progressBarX + fillRadius, progressBarY);
        exportCtx.lineTo(progressBarX + progressWidth - fillRadius, progressBarY);
        exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY, progressBarX + progressWidth, progressBarY + fillRadius);
        exportCtx.lineTo(progressBarX + progressWidth, progressBarY + progressBarHeight - fillRadius);
        exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY + progressBarHeight, progressBarX + progressWidth - fillRadius, progressBarY + progressBarHeight);
        exportCtx.lineTo(progressBarX + fillRadius, progressBarY + progressBarHeight);
        exportCtx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - fillRadius);
        exportCtx.lineTo(progressBarX, progressBarY + fillRadius);
        exportCtx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + fillRadius, progressBarY);
        exportCtx.fill();
        exportCtx.restore();
        
        const thumbX = progressBarX + progressWidth;
        const thumbY = progressBarY + progressBarHeight / 2;
        const thumbRadius = 4;
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        exportCtx.beginPath();
        exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        exportCtx.font = `12px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.textAlign = 'left';
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        const currentTime = exportAudio && !isNaN(exportAudio.currentTime) ? exportAudio.currentTime : 0;
        const totalTime = exportAudio && !isNaN(exportAudio.duration) ? exportAudio.duration : 0;
        
        exportCtx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
        
        exportCtx.textAlign = 'right';
        exportCtx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);
        
        const controlsWidth = musicPlayerWidth;
        const controlsHeight = 80;
        const controlsX = musicPlayerX;
        const controlsY = progressContainerY + progressContainerHeight - 20;
        
        const buttonSize = 45;
        const playButtonSize = 70;
        const availableWidth = controlsWidth - 60;
        
        const totalButtonWidth = 4 * buttonSize + playButtonSize;
        const totalSpacing = availableWidth - totalButtonWidth;
        const buttonSpacing = totalSpacing / 4;
        const startButtonX = controlsX + 30;
        
        const buttonY = controlsY + (controlsHeight - playButtonSize) / 2;
        
        const playIcon = (exportAudio && !exportAudio.paused) ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        const buttonIcons = ['<i class="fas fa-volume-up"></i>', '<i class="fas fa-step-backward"></i>', playIcon, '<i class="fas fa-step-forward"></i>', '<i class="fas fa-redo"></i>'];
        
        let currentX = startButtonX;
        
        for (let i = 0; i < 5; i++) {
            if (i === 2) {
                const playButtonX = currentX + playButtonSize/2;
                const playButtonYCenter = buttonY + playButtonSize/2;
                
                exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                exportCtx.beginPath();
                exportCtx.arc(playButtonX, playButtonYCenter, playButtonSize/2, 0, 2 * Math.PI);
                exportCtx.fill();
                
                exportCtx.fillStyle = '#ffffff';
                exportCtx.font = `28px Arial`;
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText(buttonIcons[i], playButtonX, playButtonYCenter);
                
                currentX += playButtonSize + buttonSpacing;
            } else {
                const buttonX = currentX + buttonSize/2;
                const buttonYCenter = buttonY + playButtonSize/2;
                
                exportCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                exportCtx.beginPath();
                exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
                exportCtx.fill();
                
                exportCtx.fillStyle = '#ffffff';
                exportCtx.font = `${buttonSize * 0.4}px Arial`;
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
                
                currentX += buttonSize + buttonSpacing;
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManagerCanvas;
}

window.ExportManagerCanvas = ExportManagerCanvas;
