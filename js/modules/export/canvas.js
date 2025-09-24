class ExportCanvas {
    // Static method to ensure Font Awesome is loaded before drawing icons
    static async ensureFontAwesomeLoaded() {
        return new Promise((resolve) => {
            if (document.fonts && document.fonts.check) {
                // Modern browsers with Font Loading API
                if (document.fonts.check('16px FontAwesome')) {
                    resolve();
                } else {
                    document.fonts.load('16px FontAwesome').then(() => {
                        resolve();
                    }).catch(() => {
                        // Fallback: wait a bit and resolve anyway
                        setTimeout(resolve, window.Constants?.ANIMATION.TIMEOUT_DELAY || 100);
                    });
                }
            } else {
                // Fallback for older browsers
                setTimeout(resolve, 100);
            }
        });
    }

    static async renderToCanvas(exportCtx, exportCanvas, vinylRotation, albumArtImage, exportAudio, exportLyrics, exportLyricsColor, exportMusicPlayerColors = null) {
        if (!exportCtx) return;

        // Vinyl rotation is handled by manager.js
        
        // Helper function to get music player colors with fallback
        const getMusicPlayerColor = (colorKey) => {
            if (exportMusicPlayerColors && exportMusicPlayerColors[colorKey]) {
                return exportMusicPlayerColors[colorKey];
            }
            // Use centralized color calculation
            const defaultColors = ColorHelper.calculatePlayerColorVariants(window.Constants.PLAYER_BASE_COLOR);
            return defaultColors[colorKey] || window.Constants.PLAYER_BASE_COLOR;
        };
        
        // Color functions are now handled by ColorHelper

        // Clear canvas
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw background using utility
        window.CanvasUtils.drawBackground(exportCtx, exportCanvas.width, exportCanvas.height);

        // Main music player card - EXACT HTML laptop view dimensions
        const musicPlayerWidth = 350; // Fixed width like HTML
        const musicPlayerHeight = musicPlayerWidth * (16/9); // aspect-ratio: 9/16 = 622.22px
        const musicPlayerX = (exportCanvas.width - musicPlayerWidth) / 2;
        const musicPlayerY = (exportCanvas.height - musicPlayerHeight) / 2;
        
        // Draw main card with CSS shadow-xl - EXACT HTML styling
        exportCtx.save();
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        exportCtx.shadowBlur = 60;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 20;
        
        exportCtx.fillStyle = getMusicPlayerColor('base');
        exportCtx.beginPath();
        const radius = 24; // --radius-2xl
        exportCtx.moveTo(musicPlayerX + radius, musicPlayerY);
        exportCtx.lineTo(musicPlayerX + musicPlayerWidth - radius, musicPlayerY);
        exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY, musicPlayerX + musicPlayerWidth, musicPlayerY + radius);
        exportCtx.lineTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight - radius);
        exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight, musicPlayerX + musicPlayerWidth - radius, musicPlayerY + musicPlayerHeight);
        exportCtx.lineTo(musicPlayerX + radius, musicPlayerY + musicPlayerHeight);
        exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY + musicPlayerHeight, musicPlayerX, musicPlayerY + musicPlayerHeight - radius);
        exportCtx.lineTo(musicPlayerX, musicPlayerY + radius);
        exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY, musicPlayerX + radius, musicPlayerY);
        exportCtx.fill();
        exportCtx.restore();

        // Song info section - điều chỉnh để cân bằng khoảng cách
        const songTitle = DOMHelper.getElementSilent('.song-title')?.textContent || '';
        const artistName = DOMHelper.getElementSilent('.artist-name')?.textContent || '';
        const lyricsText = DOMHelper.getElementSilent('.vinyl-lyrics-text')?.textContent || '';

        exportCtx.fillStyle = getMusicPlayerColor('primary');
        exportCtx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`; // Looks like 28px in HTML
        exportCtx.textAlign = 'center';
        exportCtx.fillText(songTitle, musicPlayerX + musicPlayerWidth / 2, musicPlayerY + 80); // Tăng từ 50 lên 80

        if (artistName) {
            exportCtx.font = `16px 'Patrick Hand', Arial, sans-serif`; // Looks like 16px in HTML
            exportCtx.fillStyle = getMusicPlayerColor('accent');
            exportCtx.fillText(artistName, musicPlayerX + musicPlayerWidth / 2, musicPlayerY + 105); // Tăng từ 75 lên 105
        }

        // Device container (vinyl area) - exact CSS structure
        // CSS: padding: var(--spacing-5xl) = 36px
        // Looking at HTML, it appears to be around 250px
        const deviceContainerWidth = 250; // Looks like 250px in HTML
        const deviceContainerHeight = 250;
        const deviceContainerX = musicPlayerX + (musicPlayerWidth - deviceContainerWidth) / 2;
        const deviceContainerY = musicPlayerY + 130; // Tăng từ 100 lên 130 để cân bằng
        
        // Draw device container with EXACT HTML CSS shadows and styling
        exportCtx.save();
        // CSS: box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        exportCtx.shadowBlur = 32;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 8;
        
        exportCtx.fillStyle = getMusicPlayerColor('light');
        exportCtx.beginPath();
        const containerRadius = 32; // --radius-4xl
        exportCtx.moveTo(deviceContainerX + containerRadius, deviceContainerY);
        exportCtx.lineTo(deviceContainerX + deviceContainerWidth - containerRadius, deviceContainerY);
        exportCtx.quadraticCurveTo(deviceContainerX + deviceContainerWidth, deviceContainerY, deviceContainerX + deviceContainerWidth, deviceContainerY + containerRadius);
        exportCtx.lineTo(deviceContainerX + deviceContainerWidth, deviceContainerY + deviceContainerHeight - containerRadius);
        exportCtx.quadraticCurveTo(deviceContainerX + deviceContainerWidth, deviceContainerY + deviceContainerHeight, deviceContainerX + deviceContainerWidth - containerRadius, deviceContainerY + deviceContainerHeight);
        exportCtx.lineTo(deviceContainerX + containerRadius, deviceContainerY + deviceContainerHeight);
        exportCtx.quadraticCurveTo(deviceContainerX, deviceContainerY + deviceContainerHeight, deviceContainerX, deviceContainerY + deviceContainerHeight - containerRadius);
        exportCtx.lineTo(deviceContainerX, deviceContainerY + containerRadius);
        exportCtx.quadraticCurveTo(deviceContainerX, deviceContainerY, deviceContainerX + containerRadius, deviceContainerY);
        exportCtx.fill();
        
        // Add inset highlight like CSS inset shadow
        exportCtx.shadowColor = 'transparent';
        exportCtx.shadowBlur = 0;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 0;
        
        // Draw subtle inset highlight
        exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        exportCtx.lineWidth = 2;
        exportCtx.stroke();
        
        exportCtx.restore();
        
        // Speaker grilles - positioned absolute within device container
        // Draw grilles FIRST so they appear behind circular screen
        const centerX = deviceContainerX + deviceContainerWidth / 2;
        const centerY = deviceContainerY + deviceContainerHeight / 2;
        
        // Left speaker grille - CSS: left: 10px, top: 50%, transform: translateY(-50%)
        // With 250px container: left grille at 10px, right grille at 250-10-16=224px
        const leftGrilleX = deviceContainerX + 10;
        const rightGrilleX = deviceContainerX + deviceContainerWidth - 10 - 16; // right: 10px
        const grilleWidth = 16;
        const grilleHeight = 50;
        const grilleY = deviceContainerY + deviceContainerHeight/2 - grilleHeight/2; // center of device container
        
        // Draw speaker grilles using utility
        window.CanvasUtils.drawSpeakerGrille(exportCtx, leftGrilleX, grilleY, grilleWidth, grilleHeight, grilleY, grilleHeight);
        window.CanvasUtils.drawSpeakerGrille(exportCtx, rightGrilleX, grilleY, grilleWidth, grilleHeight, grilleY, grilleHeight);
        
        // Grille dots - CENTERED and MORE DOTS for fuller look
        // Increased density: 5 columns x 12 rows, perfectly centered
        exportCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // CSS: rgba(0, 0, 0, 0.3)
        
        // Calculate centered positioning
        const totalColumns = 5;
        const totalRows = 12;
        const columnSpacing = grilleWidth / (totalColumns + 1); // Even spacing
        const rowSpacing = grilleHeight / (totalRows + 1); // Even spacing
        
        for (let i = 0; i < totalColumns; i++) {
            for (let j = 0; j < totalRows; j++) {
                // Center horizontally and vertically
                const dotX = leftGrilleX + (i + 1) * columnSpacing;
                const dotY = grilleY + (j + 1) * rowSpacing;
                exportCtx.beginPath();
                exportCtx.arc(dotX, dotY, 1, 0, 2 * Math.PI); // CSS: 1px radius
                exportCtx.fill();
                
                const dotX2 = rightGrilleX + (i + 1) * columnSpacing;
                exportCtx.beginPath();
                exportCtx.arc(dotX2, dotY, 1, 0, 2 * Math.PI); // CSS: 1px radius
                exportCtx.fill();
            }
        }
        
        // Circular screen - CSS: 180px x 180px with border and shadow
        const circularScreenSize = 180;
        
        // Draw circular screen background with CSS styling - WITH BORDER like HTML
        exportCtx.save();
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        exportCtx.shadowBlur = 8;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 0;
        
        // Draw circular screen - CSS: background: #7a6e70, border: 8px solid #7a6e70
        // Since border and background are same color, just draw one circle
        exportCtx.fillStyle = getMusicPlayerColor('darker');
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, circularScreenSize/2, 0, 2 * Math.PI);
        exportCtx.fill();
        exportCtx.restore();
        
        // Album art with rotation - CSS: 180px x 180px (inside 8px border)
        const albumArtRadius = 90 - 8; // 180px / 2 - 8px border = 82px
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
            // Default SVG image with rotation - use cached image
            if (!window.defaultAlbumArtImage) {
                const defaultSvgDataUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)"/><path d="M30 40 Q35 35 40 40 L45 50 Q50 45 55 50 L60 60 Q55 65 50 60 L45 50 Q40 55 35 50 Z" fill="white" opacity="0.8"/></svg>';
                window.defaultAlbumArtImage = new Image();
                window.defaultAlbumArtImage.src = defaultSvgDataUrl;
            }
            
            exportCtx.save();
            exportCtx.beginPath();
            exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            exportCtx.clip();
            exportCtx.save();
            exportCtx.translate(centerX, centerY);
            exportCtx.rotate((vinylRotation * Math.PI) / 180);
            exportCtx.translate(-centerX, -centerY);
            
            // Draw the default SVG image if it's loaded
            if (window.defaultAlbumArtImage.complete) {
                exportCtx.drawImage(window.defaultAlbumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                                  albumArtRadius * 2, albumArtRadius * 2);
            } else {
                // Fallback to gradient if image not loaded yet
                const gradient = window.CanvasUtils.createFallbackAlbumArtGradient(exportCtx, centerX, centerY, albumArtRadius);
                exportCtx.fillStyle = gradient;
                exportCtx.beginPath();
                exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
                exportCtx.fill();
                
                // Draw infinity symbol
                exportCtx.fillStyle = 'white';
                exportCtx.globalAlpha = 0.8;
                exportCtx.font = 'bold 40px Arial';
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText('∞', centerX, centerY);
                exportCtx.globalAlpha = 1.0;
            }
            
            exportCtx.restore();
            exportCtx.restore();
        }
        
        // Pull cord - CSS: flex-direction: column, align-items: center
        const cordX = centerX;
        const cordY = deviceContainerY + deviceContainerHeight;
        const cordWidth = 4; // CSS: width: var(--spacing-xs) = 4px
        const cordHeight = 38; // CSS: height: 38px
        const handleWidth = 12; // CSS: width: 12px
        const handleHeight = 18; // CSS: height: 18px
        
        // Cord line - CSS: width: 4px, height: 38px, box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1)
        exportCtx.save();
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        exportCtx.shadowBlur = 2;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 1;
        
        exportCtx.fillStyle = getMusicPlayerColor('base');
        exportCtx.fillRect(cordX - cordWidth/2, cordY, cordWidth, cordHeight);
        exportCtx.restore();
        
        // Cord handle - CSS: margin-top: -4px (chồng lên cord-line 4px)
        exportCtx.save();
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        exportCtx.shadowBlur = 4;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 2;
        
        exportCtx.fillStyle = getMusicPlayerColor('base');
        const handleX = cordX - handleWidth/2;
        const handleY = cordY + cordHeight - 4; // CSS: margin-top: -4px
        
        // Draw rounded rectangle with custom border radius: 16px 16px 3px 3px
        exportCtx.beginPath();
        exportCtx.moveTo(handleX + 16, handleY);
        exportCtx.lineTo(handleX + handleWidth - 16, handleY);
        exportCtx.quadraticCurveTo(handleX + handleWidth, handleY, handleX + handleWidth, handleY + 16);
        exportCtx.lineTo(handleX + handleWidth, handleY + handleHeight - 3);
        exportCtx.quadraticCurveTo(handleX + handleWidth, handleY + handleHeight, handleX + handleWidth - 3, handleY + handleHeight);
        exportCtx.lineTo(handleX + 3, handleY + handleHeight);
        exportCtx.quadraticCurveTo(handleX, handleY + handleHeight, handleX, handleY + handleHeight - 3);
        exportCtx.lineTo(handleX, handleY + 16);
        exportCtx.quadraticCurveTo(handleX, handleY, handleX + 16, handleY);
        exportCtx.closePath();
        exportCtx.fill();
        exportCtx.restore();

        // Current lyric section - positioned below pull cord
        const currentLyricY = cordY + cordHeight + handleHeight + 20;
        
        // Improved lyrics display with better error handling
        if (exportAudio && exportLyrics.length > 0) {
            const currentTime = exportAudio.currentTime;
            
            // More robust lyric finding
            if (!isNaN(currentTime) && currentTime >= 0) {
                const currentLyric = exportLyrics.find(lyric => 
                    currentTime >= lyric.start && currentTime <= lyric.end
                );
                
                if (currentLyric && currentLyric.text) {
                    exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`; // Looks like 20px in HTML
                    exportCtx.fillStyle = exportLyricsColor;
                    exportCtx.fillText(currentLyric.text, musicPlayerX + musicPlayerWidth / 2, currentLyricY);
                }
            }
        } else if (lyricsText && lyricsText.trim()) {
            exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`; // Looks like 20px in HTML
            exportCtx.fillStyle = exportLyricsColor;
            exportCtx.fillText(lyricsText, musicPlayerX + musicPlayerWidth / 2, currentLyricY);
        }

        // Progress container - moved up closer to lyrics
        const progressContainerWidth = musicPlayerWidth;
        const progressContainerHeight = 50;
        const progressContainerX = musicPlayerX;
        const progressContainerY = currentLyricY + 12; // Reduced from 40 to 25
        
        const progressBarWidth = progressContainerWidth - 60;
        const progressBarHeight = 4;
        const progressBarX = progressContainerX + 30;
        const progressBarY = progressContainerY + 10;
        
        // Progress bar background - EXACT HTML CSS values
        exportCtx.fillStyle = getMusicPlayerColor('muted'); // CSS: background: muted color
        exportCtx.save();
        exportCtx.beginPath();
        const bgRadius = 4; // CSS: border-radius: var(--spacing-xs) = 4px
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
        
        // Progress bar fill - improved with better error handling
        let progressPercent = 0.0;
        if (exportAudio && exportAudio.readyState >= 2) {
            const currentTime = exportAudio.currentTime;
            const duration = exportAudio.duration;
            
            // More robust progress calculation
            if (!isNaN(currentTime) && !isNaN(duration) && duration > 0 && currentTime >= 0) {
                progressPercent = Math.min(Math.max(currentTime / duration, 0.0), 1.0);
            }
        }
        const progressWidth = progressBarWidth * progressPercent;
        
        exportCtx.fillStyle = getMusicPlayerColor('medium'); // CSS: background: medium color
        exportCtx.save();
        exportCtx.beginPath();
        const fillRadius = 4; // CSS: border-radius: var(--spacing-xs) = 4px
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
        
        // Progress thumb
        const thumbX = progressBarX + progressWidth;
        const thumbY = progressBarY + progressBarHeight / 2;
        const thumbRadius = 4;
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        exportCtx.beginPath();
        exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        // Time display - EXACT HTML values
        exportCtx.fillStyle = getMusicPlayerColor('medium');
        exportCtx.font = `12px 'Patrick Hand', Arial, sans-serif`; // --text-xs = 12px
        exportCtx.textAlign = 'left';
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        // Improved time display with better error handling
        let currentTime = 0;
        let totalTime = 0;
        
        if (exportAudio && exportAudio.readyState >= 2) {
            if (!isNaN(exportAudio.currentTime) && exportAudio.currentTime >= 0) {
                currentTime = exportAudio.currentTime;
            }
            if (!isNaN(exportAudio.duration) && exportAudio.duration > 0) {
                totalTime = exportAudio.duration;
            }
        }
        
        exportCtx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
        
        exportCtx.textAlign = 'right';
        exportCtx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);
        
        // Ensure Font Awesome is loaded before drawing icons
        await ExportCanvas.ensureFontAwesomeLoaded();
        
        // Controls - moved up closer to progress bar
        const controlsWidth = musicPlayerWidth;
        const controlsHeight = 80;
        const controlsX = musicPlayerX;
        const controlsY = progressContainerY + progressContainerHeight - 20; // Reduced from -20 to -5
        
        const buttonSize = 44; // CSS: width: 44px, height: 44px
        const playButtonSize = 60; // CSS: width: 60px, height: 60px
        const availableWidth = controlsWidth - 60;
        
        const totalButtonWidth = 4 * buttonSize + playButtonSize;
        const totalSpacing = availableWidth - totalButtonWidth;
        const buttonSpacing = totalSpacing / 4;
        const startButtonX = controlsX + 30;
        
        const buttonY = controlsY + (controlsHeight - playButtonSize) / 2;
        
        const playIcon = (exportAudio && !exportAudio.paused) ? '\uf04c' : '\uf04b'; // fa-pause : fa-play
        const buttonIcons = ['\uf028', '\uf048', playIcon, '\uf051', '\uf01e']; // fa-volume-up, fa-step-backward, play/pause, fa-step-forward, fa-redo
        
        let currentX = startButtonX;
        
        for (let i = 0; i < 5; i++) {
            if (i === 2) {
                // Play button - EXACT HTML CSS styling
                const playButtonX = currentX + playButtonSize/2;
                const playButtonYCenter = buttonY + playButtonSize/2;
                
                // CSS: background: #d8cdb9, border: 4px solid #b0a591 !important (vinyl-play-pause-btn)
                exportCtx.fillStyle = getMusicPlayerColor('lighter');
                exportCtx.beginPath();
                exportCtx.arc(playButtonX, playButtonYCenter, playButtonSize/2, 0, 2 * Math.PI);
                exportCtx.fill();
                
                // Draw border like CSS border: 4px solid #b0a591 !important
                exportCtx.strokeStyle = getMusicPlayerColor('subtle');
                exportCtx.lineWidth = 4;
                exportCtx.stroke();
                
                exportCtx.fillStyle = getMusicPlayerColor('strong'); // CSS: color: strong color
                exportCtx.font = `28px FontAwesome`; // CSS: font-size: var(--text-3xl) = 28px
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText(buttonIcons[i], playButtonX, playButtonYCenter);
                
                currentX += playButtonSize + buttonSpacing;
            } else {
                const buttonX = currentX + buttonSize/2;
                const buttonYCenter = buttonY + playButtonSize/2;
                
                if (i === 0 || i === 4) {
                    // Volume (nth-child(1)) and Repeat (nth-child(5)) buttons - CSS: background: transparent
                    exportCtx.fillStyle = 'transparent';
                    exportCtx.beginPath();
                    exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
                    exportCtx.fill();
                    
                    exportCtx.fillStyle = getMusicPlayerColor('strong');
                } else {
                    // Previous (nth-child(2)) and Next (nth-child(4)) buttons - CSS: border: 3px solid #b0a591
                    exportCtx.fillStyle = getMusicPlayerColor('lighter');
                    exportCtx.beginPath();
                    exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
                    exportCtx.fill();
                    
                    // Draw border like CSS border: 3px solid #b0a591
                    exportCtx.strokeStyle = getMusicPlayerColor('subtle');
                    exportCtx.lineWidth = 3;
                    exportCtx.stroke();
                    
                    exportCtx.fillStyle = getMusicPlayerColor('strong');
                }
                
                exportCtx.font = `20px FontAwesome`; // CSS: font-size: var(--text-xl) = 20px
                exportCtx.textAlign = 'center';
                exportCtx.textBaseline = 'middle';
                exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
                
                currentX += buttonSize + buttonSpacing;
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportCanvas;
}

window.ExportCanvas = ExportCanvas;