/**
 * Export Manager Module
 * Handles video export functionality with canvas rendering
 */
class ExportManager {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.exportCanvas = null;
        this.exportCtx = null;
        this.exportAnimationId = null;
        this.vinylRotation = 0;
        this.albumArtImage = null;
        this.exportAudio = null;
        this.exportLyrics = [];
        this.exportLyricsColor = '#ffb3d1';
        
        this.eventBus = window.eventBus;
        this.appState = window.appState;
        this.fileUtils = window.FileUtils;
        this.timeUtils = window.TimeUtils;
        
        this.setupEventListeners();
    }
    
    /**
     * Start video export
     * @param {Object} exportData - Export data
     */
    async startExport(exportData) {
        const { audioFile, songTitle, artistName, albumArtFile } = exportData;
        
        if (this.appState.get('export.isExporting')) {
            throw new Error('Export already in progress');
        }
        
        try {
            this.appState.set('export.isExporting', true);
            this.appState.set('export.progress', 0);
            this.appState.set('export.message', 'Initializing export...');
            
            this.eventBus.emit('export:progress', { progress: 5, message: 'Initializing export...' });
            
            // Pause main audio if playing
            this.wasMainAudioPlaying = this.pauseMainAudio();
            
            // Disable controls
            this.disableControls();
            
            // Auto scroll to export progress immediately
            this.scrollToExportProgress();
            
            // Setup export timeout
            const exportTimeout = this.setupExportTimeout(this.wasMainAudioPlaying);
            
            // Create export canvas
            this.createExportCanvas();
            
            // Load album art if provided
            if (albumArtFile) {
                await this.loadAlbumArt(albumArtFile);
            }
            
            // Load export audio
            await this.loadExportAudio(audioFile);
            
            // Setup export lyrics
            this.setupExportLyrics();
            
            // Start recording
            await this.startRecording();
            
            // Start rendering loop
            this.startRenderingLoop();
            
            // Setup progress tracking
            this.setupProgressTracking(exportTimeout);
            
        } catch (error) {
            await this.handleExportError(error);
            throw error;
        }
    }
    
    /**
     * Create export canvas
     */
    createExportCanvas() {
        this.exportCanvas = document.createElement('canvas');
        
        let canvasWidth = 720;
        let canvasHeight = 1280;
        
        // Try to get dimensions from various sources
        const dimensionSources = [
            () => {
                const vinylPlayer = document.querySelector('.vinyl-player');
                if (vinylPlayer) {
                    const rect = vinylPlayer.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        return { width: rect.width, height: rect.height };
                    }
                }
                return null;
            },
            () => {
                const iframe = window.frameElement;
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        return { width: rect.width, height: rect.height };
                    }
                }
                return null;
            },
            () => {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                if (windowWidth > 0 && windowHeight > 0) {
                    const aspectRatio = 9 / 16;
                    if (windowWidth / windowHeight > aspectRatio) {
                        return { width: windowHeight * aspectRatio, height: windowHeight };
                    } else {
                        return { width: windowWidth, height: windowWidth / aspectRatio };
                    }
                }
                return null;
            }
        ];
        
        for (const getDimensions of dimensionSources) {
            try {
                const dimensions = getDimensions();
                if (dimensions) {
                    canvasWidth = dimensions.width;
                    canvasHeight = dimensions.height;
                    break;
                }
            } catch (e) {
                // Continue to next source
            }
        }
        
        this.exportCanvas.width = Math.max(canvasWidth, 400);
        this.exportCanvas.height = Math.max(canvasHeight, 600);
        
        this.exportCtx = this.exportCanvas.getContext('2d');
        this.exportCtx.imageSmoothingEnabled = true;
        this.exportCtx.imageSmoothingQuality = 'high';
    }
    
    /**
     * Load album art for export
     * @param {File} albumArtFile - Album art file
     */
    async loadAlbumArt(albumArtFile) {
        this.eventBus.emit('export:progress', { progress: 15, message: 'Loading album art...' });
        
        this.albumArtImage = new Image();
        this.albumArtImage.src = this.fileUtils.createObjectURL(albumArtFile);
        
        await new Promise((resolve, reject) => {
            this.albumArtImage.onload = resolve;
            this.albumArtImage.onerror = reject;
        });
    }
    
    /**
     * Load audio for export
     * @param {File} audioFile - Audio file
     */
    async loadExportAudio(audioFile) {
        this.eventBus.emit('export:progress', { progress: 20, message: 'Loading audio...' });
        
        const audioUrl = this.fileUtils.createObjectURL(audioFile);
        this.exportAudio = new Audio(audioUrl);
        
        await new Promise((resolve, reject) => {
            this.exportAudio.addEventListener('loadedmetadata', resolve);
            this.exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });
    }
    
    /**
     * Setup export lyrics
     */
    setupExportLyrics() {
        this.exportLyrics = [...this.appState.get('lyrics.items')];
        
        if (window.lyricsColorManager) {
            this.exportLyricsColor = window.lyricsColorManager.getCurrentColor();
        }
    }
    
    /**
     * Start recording
     */
    async startRecording() {
        this.eventBus.emit('export:progress', { progress: 25, message: 'Setting up video recorder...' });
        
        const canvasStream = this.exportCanvas.captureStream(30);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(this.exportAudio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);
        
        const mimeType = this.getSupportedMimeType();
        
        this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
        this.recordedChunks = [];
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            this.handleRecordingComplete();
        };
        
        this.mediaRecorder.start();
        this.exportAudio.play();
        
        this.eventBus.emit('export:progress', { progress: 30, message: 'Recording started...' });
    }
    
    /**
     * Get supported MIME type for recording
     * @returns {string} Supported MIME type
     */
    getSupportedMimeType() {
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType;
            }
        }
        
        return 'video/webm';
    }
    
    /**
     * Start rendering loop
     */
    startRenderingLoop() {
        const renderLoop = () => {
            if (window.ExportManagerCanvas) {
                window.ExportManagerCanvas.renderToCanvas(
                    this.exportCtx,
                    this.exportCanvas,
                    this.vinylRotation,
                    this.albumArtImage,
                    this.exportAudio,
                    this.exportLyrics,
                    this.exportLyricsColor
                );
            }
            this.exportAnimationId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
    }
    
    /**
     * Render frame to canvas
     */
    renderToCanvas() {
        if (!this.exportCtx) return;
        
        this.vinylRotation += 0.3;
        
        // Clear canvas
        this.exportCtx.clearRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
        
        // Draw background
        this.drawBackground();
        
        // Draw music player
        this.drawMusicPlayer();
        
        // Draw vinyl
        this.drawVinyl();
        
        // Draw tonearm
        this.drawTonearm();
        
        // Draw song info
        this.drawSongInfo();
        
        // Draw progress bar
        this.drawProgressBar();
        
        // Draw controls
        this.drawControls();
    }
    
    /**
     * Draw background
     */
    drawBackground() {
        const bodyGradient = this.exportCtx.createLinearGradient(0, 0, this.exportCanvas.width, this.exportCanvas.height);
        bodyGradient.addColorStop(0, '#667eea');
        bodyGradient.addColorStop(0.25, '#764ba2');
        bodyGradient.addColorStop(0.5, '#f093fb');
        bodyGradient.addColorStop(0.75, '#f5576c');
        bodyGradient.addColorStop(1, '#4facfe');
        
        this.exportCtx.fillStyle = bodyGradient;
        this.exportCtx.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
        
        // Add overlay
        this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.exportCtx.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
    }
    
    /**
     * Draw music player container
     */
    drawMusicPlayer() {
        const musicPlayerWidth = Math.min(this.exportCanvas.width * 0.9, 350);
        const musicPlayerHeight = Math.min(this.exportCanvas.height * 0.9, 600);
        const musicPlayerX = (this.exportCanvas.width - musicPlayerWidth) / 2;
        const musicPlayerY = (this.exportCanvas.height - musicPlayerHeight) / 2;
        
        // Draw rounded rectangle
        this.exportCtx.save();
        this.exportCtx.beginPath();
        const radius = 30;
        this.exportCtx.moveTo(musicPlayerX + radius, musicPlayerY);
        this.exportCtx.lineTo(musicPlayerX + musicPlayerWidth - radius, musicPlayerY);
        this.exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY, musicPlayerX + musicPlayerWidth, musicPlayerY + radius);
        this.exportCtx.lineTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight - radius);
        this.exportCtx.quadraticCurveTo(musicPlayerX + musicPlayerWidth, musicPlayerY + musicPlayerHeight, musicPlayerX + musicPlayerWidth - radius, musicPlayerY + musicPlayerHeight);
        this.exportCtx.lineTo(musicPlayerX + radius, musicPlayerY + musicPlayerHeight);
        this.exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY + musicPlayerHeight, musicPlayerX, musicPlayerY + musicPlayerHeight - radius);
        this.exportCtx.lineTo(musicPlayerX, musicPlayerY + radius);
        this.exportCtx.quadraticCurveTo(musicPlayerX, musicPlayerY, musicPlayerX + radius, musicPlayerY);
        this.exportCtx.clip();
        
        // Draw album art background if available
        if (this.albumArtImage) {
            this.drawAlbumArtBackground(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
        }
        
        // Add overlay
        this.exportCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.exportCtx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
        
        this.exportCtx.restore();
    }
    
    /**
     * Draw album art background
     */
    drawAlbumArtBackground(x, y, width, height) {
        const imgAspect = this.albumArtImage.width / this.albumArtImage.height;
        const playerAspect = width / height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > playerAspect) {
            drawHeight = height;
            drawWidth = drawHeight * imgAspect;
            offsetX = x + (width - drawWidth) / 2;
            offsetY = y;
        } else {
            drawWidth = width;
            drawHeight = drawWidth / imgAspect;
            offsetX = x;
            offsetY = y + (height - drawHeight) / 2;
        }
        
        this.exportCtx.drawImage(this.albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    /**
     * Draw vinyl
     */
    drawVinyl() {
        const vinylContainerWidth = 200;
        const vinylContainerHeight = 200;
        const vinylContainerX = (this.exportCanvas.width - vinylContainerWidth) / 2;
        const vinylContainerY = (this.exportCanvas.height - vinylContainerHeight) / 2 - 20;
        
        const centerX = vinylContainerX + vinylContainerWidth / 2;
        const centerY = vinylContainerY + vinylContainerHeight / 2;
        const vinylRadius = vinylContainerWidth / 2;
        
        // Draw vinyl with rotation
        this.exportCtx.save();
        this.exportCtx.translate(centerX, centerY);
        this.exportCtx.rotate((this.vinylRotation * Math.PI) / 180);
        this.exportCtx.translate(-centerX, -centerY);
        
        // Draw vinyl disc
        const vinylGradient = this.exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
        vinylGradient.addColorStop(0, '#2a2a2a');
        vinylGradient.addColorStop(0.2, '#2a2a2a');
        vinylGradient.addColorStop(0.4, '#1a1a1a');
        vinylGradient.addColorStop(0.8, '#000000');
        vinylGradient.addColorStop(1, '#000000');
        
        this.exportCtx.fillStyle = vinylGradient;
        this.exportCtx.beginPath();
        this.exportCtx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
        this.exportCtx.fill();
        
        // Draw grooves
        this.drawVinylGrooves(centerX, centerY, vinylRadius);
        
        // Draw center
        this.drawVinylCenter(centerX, centerY, vinylRadius);
        
        // Draw album art in center
        this.drawVinylAlbumArt(centerX, centerY, vinylRadius);
        
        this.exportCtx.restore();
    }
    
    /**
     * Draw vinyl grooves
     */
    drawVinylGrooves(centerX, centerY, vinylRadius) {
        this.exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.exportCtx.lineWidth = 1;
        
        const grooveRadii = [vinylRadius * 0.8, vinylRadius * 0.68, vinylRadius * 0.56];
        
        grooveRadii.forEach(radius => {
            this.exportCtx.beginPath();
            this.exportCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.exportCtx.stroke();
        });
    }
    
    /**
     * Draw vinyl center
     */
    drawVinylCenter(centerX, centerY, vinylRadius) {
        const centerRadius = vinylRadius * 0.48;
        
        const centerGradient = this.exportCtx.createLinearGradient(centerX - centerRadius, centerY - centerRadius, centerX + centerRadius, centerY + centerRadius);
        centerGradient.addColorStop(0, '#667eea');
        centerGradient.addColorStop(1, '#764ba2');
        
        this.exportCtx.fillStyle = centerGradient;
        this.exportCtx.beginPath();
        this.exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.exportCtx.fill();
        
        // Add highlight
        const centerHighlight = this.exportCtx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0, centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8);
        centerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        centerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        centerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.exportCtx.fillStyle = centerHighlight;
        this.exportCtx.beginPath();
        this.exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        this.exportCtx.fill();
    }
    
    /**
     * Draw vinyl album art
     */
    drawVinylAlbumArt(centerX, centerY, vinylRadius) {
        const albumArtRadius = vinylRadius * 0.48 * 0.83;
        
        if (this.albumArtImage) {
            this.exportCtx.save();
            this.exportCtx.beginPath();
            this.exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
            this.exportCtx.clip();
            
            this.exportCtx.drawImage(this.albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, albumArtRadius * 2, albumArtRadius * 2);
            this.exportCtx.restore();
        }
    }
    
    /**
     * Draw tonearm
     */
    drawTonearm() {
        const tonearmX = this.exportCanvas.width / 2 + 84;
        const tonearmY = this.exportCanvas.height / 2 - 84;
        const tonearmLength = 96;
        
        this.exportCtx.save();
        this.exportCtx.translate(tonearmX, tonearmY);
        this.exportCtx.rotate(25 * Math.PI / 180);
        
        const tonearmGradient = this.exportCtx.createLinearGradient(0, 0, 0, tonearmLength);
        tonearmGradient.addColorStop(0, '#fff');
        tonearmGradient.addColorStop(1, '#ccc');
        
        this.exportCtx.fillStyle = tonearmGradient;
        this.exportCtx.fillRect(-1.5, 0, 3, tonearmLength);
        
        // Draw tonearm base
        this.exportCtx.fillStyle = '#fff';
        this.exportCtx.beginPath();
        this.exportCtx.arc(-1.5, 0, 5, 0, 2 * Math.PI);
        this.exportCtx.fill();
        
        // Draw tonearm tip
        this.exportCtx.fillStyle = '#666';
        this.exportCtx.fillRect(-2, tonearmLength - 5, 6, 10);
        
        this.exportCtx.restore();
    }
    
    /**
     * Draw song info
     */
    drawSongInfo() {
        const songInfoX = 0;
        const songInfoY = this.exportCanvas.height / 2 + 120;
        const songInfoWidth = this.exportCanvas.width;
        
        const songTitle = this.appState.get('ui.songTitle') || '';
        const artistName = this.appState.get('ui.artistName') || '';
        
        // Draw song title
        this.exportCtx.fillStyle = '#ffffff';
        this.exportCtx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`;
        this.exportCtx.textAlign = 'center';
        this.exportCtx.fillText(songTitle, songInfoX + songInfoWidth / 2, songInfoY);
        
        // Draw artist name
        if (artistName) {
            this.exportCtx.font = `16px 'Patrick Hand', Arial, sans-serif`;
            this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.exportCtx.fillText(artistName, songInfoX + songInfoWidth / 2, songInfoY + 25);
        }
        
        // Draw current lyric
        this.drawCurrentLyric(songInfoX, songInfoY, songInfoWidth);
    }
    
    /**
     * Draw current lyric
     */
    drawCurrentLyric(x, y, width) {
        if (this.exportAudio && this.exportLyrics.length > 0) {
            const currentTime = this.exportAudio.currentTime;
            const currentLyric = this.timeUtils.getCurrentLyric(this.exportLyrics, currentTime);
            
            if (currentLyric) {
                this.exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`;
                this.exportCtx.fillStyle = this.exportLyricsColor;
                this.exportCtx.fillText(currentLyric.text, x + width / 2, y + 60);
            }
        }
    }
    
    /**
     * Draw progress bar
     */
    drawProgressBar() {
        const progressContainerWidth = this.exportCanvas.width;
        const progressContainerHeight = 50;
        const progressContainerX = 0;
        const progressContainerY = this.exportCanvas.height / 2 + 200;
        
        const progressBarWidth = progressContainerWidth - 60;
        const progressBarHeight = 4;
        const progressBarX = 30;
        const progressBarY = progressContainerY + 10;
        
        // Draw progress bar background
        this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.exportCtx.save();
        this.exportCtx.beginPath();
        const bgRadius = 2;
        this.exportCtx.moveTo(progressBarX + bgRadius, progressBarY);
        this.exportCtx.lineTo(progressBarX + progressBarWidth - bgRadius, progressBarY);
        this.exportCtx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY, progressBarX + progressBarWidth, progressBarY + bgRadius);
        this.exportCtx.lineTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight - bgRadius);
        this.exportCtx.quadraticCurveTo(progressBarX + progressBarWidth, progressBarY + progressBarHeight, progressBarX + progressBarWidth - bgRadius, progressBarY + progressBarHeight);
        this.exportCtx.lineTo(progressBarX + bgRadius, progressBarY + progressBarHeight);
        this.exportCtx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - bgRadius);
        this.exportCtx.lineTo(progressBarX, progressBarY + bgRadius);
        this.exportCtx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + bgRadius, progressBarY);
        this.exportCtx.fill();
        this.exportCtx.restore();
        
        // Draw progress
        let progressPercent = 0.0;
        if (this.exportAudio && this.exportAudio.readyState >= 2 && !isNaN(this.exportAudio.currentTime) && !isNaN(this.exportAudio.duration) && this.exportAudio.duration > 0) {
            progressPercent = Math.min(this.exportAudio.currentTime / this.exportAudio.duration, 1.0);
        }
        
        const progressWidth = progressBarWidth * progressPercent;
        const progressGradient = this.exportCtx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
        progressGradient.addColorStop(0, '#667eea');
        progressGradient.addColorStop(1, '#764ba2');
        
        this.exportCtx.fillStyle = progressGradient;
        this.exportCtx.save();
        this.exportCtx.beginPath();
        const fillRadius = 2;
        this.exportCtx.moveTo(progressBarX + fillRadius, progressBarY);
        this.exportCtx.lineTo(progressBarX + progressWidth - fillRadius, progressBarY);
        this.exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY, progressBarX + progressWidth, progressBarY + fillRadius);
        this.exportCtx.lineTo(progressBarX + progressWidth, progressBarY + progressBarHeight - fillRadius);
        this.exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY + progressBarHeight, progressBarX + progressWidth - fillRadius, progressBarY + progressBarHeight);
        this.exportCtx.lineTo(progressBarX + fillRadius, progressBarY + progressBarHeight);
        this.exportCtx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - fillRadius);
        this.exportCtx.lineTo(progressBarX, progressBarY + bgRadius);
        this.exportCtx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + fillRadius, progressBarY);
        this.exportCtx.fill();
        this.exportCtx.restore();
        
        // Draw progress thumb
        const thumbX = progressBarX + progressWidth;
        const thumbY = progressBarY + progressBarHeight / 2;
        const thumbRadius = 4;
        this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.exportCtx.beginPath();
        this.exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        this.exportCtx.fill();
        
        // Draw time labels
        this.drawTimeLabels(progressBarX, progressBarY, progressBarWidth);
    }
    
    /**
     * Draw time labels
     */
    drawTimeLabels(x, y, width) {
        this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.exportCtx.font = `12px 'Patrick Hand', Arial, sans-serif`;
        this.exportCtx.textAlign = 'left';
        
        const currentTime = this.exportAudio && !isNaN(this.exportAudio.currentTime) ? this.exportAudio.currentTime : 0;
        const totalTime = this.exportAudio && !isNaN(this.exportAudio.duration) ? this.exportAudio.duration : 0;
        
        this.exportCtx.fillText(this.timeUtils.formatTime(currentTime), x, y + 20);
        
        this.exportCtx.textAlign = 'right';
        this.exportCtx.fillText(this.timeUtils.formatTime(totalTime), x + width, y + 20);
    }
    
    /**
     * Draw controls
     */
    drawControls() {
        const controlsWidth = this.exportCanvas.width;
        const controlsHeight = 80;
        const controlsX = 0;
        const controlsY = this.exportCanvas.height / 2 + 230;
        
        const buttonSize = 45;
        const playButtonSize = 70;
        const availableWidth = controlsWidth - 60;
        
        const totalButtonWidth = 4 * buttonSize + playButtonSize;
        const totalSpacing = availableWidth - totalButtonWidth;
        const buttonSpacing = totalSpacing / 4;
        const startButtonX = 30;
        
        const buttonY = controlsY + (controlsHeight - playButtonSize) / 2;
        
        const playIcon = (this.exportAudio && !this.exportAudio.paused) ? '⏸' : '▶';
        const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];
        
        let currentX = startButtonX;
        
        for (let i = 0; i < 5; i++) {
            if (i === 2) {
                const playButtonX = currentX + playButtonSize/2;
                const playButtonYCenter = buttonY + playButtonSize/2;
                
                this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.exportCtx.beginPath();
                this.exportCtx.arc(playButtonX, playButtonYCenter, playButtonSize/2, 0, 2 * Math.PI);
                this.exportCtx.fill();
                
                this.exportCtx.fillStyle = '#ffffff';
                this.exportCtx.font = `28px Arial`;
                this.exportCtx.textAlign = 'center';
                this.exportCtx.textBaseline = 'middle';
                this.exportCtx.fillText(buttonIcons[i], playButtonX, playButtonYCenter);
                
                currentX += playButtonSize + buttonSpacing;
            } else {
                const buttonX = currentX + buttonSize/2;
                const buttonYCenter = buttonY + playButtonSize/2;
                
                this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.exportCtx.beginPath();
                this.exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
                this.exportCtx.fill();
                
                this.exportCtx.fillStyle = '#ffffff';
                this.exportCtx.font = `${buttonSize * 0.4}px Arial`;
                this.exportCtx.textAlign = 'center';
                this.exportCtx.textBaseline = 'middle';
                this.exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
                
                currentX += buttonSize + buttonSpacing;
            }
        }
    }
    
    /**
     * Setup progress tracking
     * @param {number} exportTimeout - Export timeout ID
     */
    setupProgressTracking(exportTimeout) {
        const duration = this.exportAudio.duration;
        const startTime = Date.now();
        
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(30 + (elapsed / duration) * 60, 90);
            
            this.appState.set('export.progress', progress);
            this.appState.set('export.message', `Recording... ${Math.round(progress)}%`);
            
            this.eventBus.emit('export:progress', { 
                progress: progress, 
                message: `Recording... ${Math.round(progress)}%` 
            });
            
            if (elapsed >= duration) {
                clearInterval(progressInterval);
                this.stopRecording();
            }
        }, 100);
    }
    
    /**
     * Stop recording
     */
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        if (this.exportAnimationId) {
            cancelAnimationFrame(this.exportAnimationId);
            this.exportAnimationId = null;
        }
        
        if (this.exportAudio) {
            this.exportAudio.pause();
        }
    }
    
    /**
     * Handle recording complete
     */
    handleRecordingComplete() {
        const webmBlob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
        const songTitle = this.appState.get('ui.songTitle') || 'untitled';
        const fileName = `${this.fileUtils.sanitizeFilename(songTitle)}.webm`;
        
        this.appState.set('export.progress', 100);
        this.appState.set('export.message', 'Export complete!');
        
        this.eventBus.emit('export:complete', {
            videoBlob: webmBlob,
            fileName: fileName,
            wasMainAudioPlaying: this.wasMainAudioPlaying
        });
        
        this.cleanup();
    }
    
    /**
     * Pause main audio if playing
     * @returns {boolean} Whether main audio was playing
     */
    pauseMainAudio() {
        const audioElement = this.appState.get('audio.element');
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
            // Update UI state to show play button and stop vinyl animation
            this.appState.set('audio.isPlaying', false);
            this.appState.set('vinyl.isAnimating', false);
            
            // Trigger UI update
            this.eventBus.emit('audio:requestUpdateUI');
            return true;
        }
        return false;
    }
    
    /**
     * Resume main audio if it was playing
     * @param {boolean} wasMainAudioPlaying - Whether main audio was playing
     */
    resumeMainAudio(wasMainAudioPlaying) {
        if (wasMainAudioPlaying) {
            const audioElement = this.appState.get('audio.element');
            if (audioElement) {
                audioElement.play().then(() => {
                    // Update UI state to show pause button and resume vinyl animation
                    this.appState.set('audio.isPlaying', true);
                    this.appState.set('vinyl.isAnimating', true);
                    
                    // Trigger UI update
                    this.eventBus.emit('audio:requestUpdateUI');
                }).catch(error => {
                    console.warn('Failed to resume audio:', error);
                });
            }
        }
    }
    
    /**
     * Disable controls during export
     */
    disableControls() {
        // Disable audio control buttons
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        // Disable export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
            exportBtn.style.cursor = 'not-allowed';
        }
    }
    
    /**
     * Enable controls after export
     */
    enableControls() {
        // Enable audio control buttons
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        // Enable export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
            exportBtn.style.cursor = 'pointer';
        }
    }
    
    /**
     * Scroll to export progress component
     */
    scrollToExportProgress() {
        const exportProgress = document.getElementById('export-progress');
        if (exportProgress) {
            exportProgress.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }
    
    /**
     * Update export progress in UI
     * @param {Object} data - Progress data
     */
    updateExportProgress(data) {
        const exportProgress = document.getElementById('export-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress && progressFill && progressText) {
            exportProgress.style.display = 'block';
            progressFill.style.width = data.progress + '%';
            progressText.textContent = data.message;
        }
    }
    
    /**
     * Handle export complete in UI
     * @param {Object} data - Export complete data
     */
    handleExportComplete(data) {
        const { videoBlob, fileName, wasMainAudioPlaying } = data;
        
        this.fileUtils.downloadBlob(videoBlob, fileName);
        
        // Resume main audio if it was playing
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = document.getElementById('export-progress');
        const exportBtn = document.getElementById('export-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress) {
            exportProgress.style.display = 'none';
        }
        
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressText) {
            progressText.textContent = 'Preparing export...';
        }
        
        if (window.toastManager) {
            window.toastManager.showSuccess('Export Complete', 'WebM video exported successfully!');
        }
    }
    
    /**
     * Handle export error in UI
     * @param {Object} data - Error data
     */
    handleExportError(data) {
        const { wasMainAudioPlaying } = data;
        
        // Resume main audio if it was playing
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = document.getElementById('export-progress');
        const exportBtn = document.getElementById('export-btn');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (exportProgress) {
            exportProgress.style.display = 'none';
        }
        
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressText) {
            progressText.textContent = 'Preparing export...';
        }
        
        if (window.toastManager) {
            window.toastManager.showError('Export Failed', 'Export failed: ' + data.error);
        }
    }
    
    /**
     * Setup export timeout
     * @param {boolean} wasMainAudioPlaying - Whether main audio was playing
     * @returns {number} Timeout ID
     */
    setupExportTimeout(wasMainAudioPlaying) {
        return setTimeout(() => {
            this.handleExportError(new Error('Export timeout. Please try again with a shorter audio file.'));
        }, 5 * 60 * 1000);
    }
    
    /**
     * Handle export error
     * @param {Error} error - Error object
     */
    async handleExportError(error) {
        this.cleanup();
        
        this.appState.set('export.isExporting', false);
        this.appState.set('export.progress', 0);
        this.appState.set('export.message', '');
        
        this.eventBus.emit('export:error', { 
            error: error.message,
            wasMainAudioPlaying: this.wasMainAudioPlaying
        });
    }
    
    /**
     * Cleanup export resources
     */
    cleanup() {
        if (this.exportAudio) {
            this.exportAudio.pause();
            this.exportAudio = null;
        }
        
        if (this.albumArtImage) {
            this.fileUtils.revokeObjectURL(this.albumArtImage.src);
            this.albumArtImage = null;
        }
        
        if (this.exportAnimationId) {
            cancelAnimationFrame(this.exportAnimationId);
            this.exportAnimationId = null;
        }
        
        this.enableControls();
        this.appState.set('export.isExporting', false);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for export requests
        this.eventBus.on('export:requestStart', (data) => {
            this.startExport(data);
        });
        
        // Lyrics color is handled by LyricsManager
        
        // Export events are handled internally
    }
    
    /**
     * Get export state
     * @returns {Object} Current export state
     */
    getState() {
        return {
            isExporting: this.appState.get('export.isExporting'),
            progress: this.appState.get('export.progress'),
            message: this.appState.get('export.message')
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.cleanup();
        this.eventBus.emit('export:destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}

window.ExportManager = ExportManager;
