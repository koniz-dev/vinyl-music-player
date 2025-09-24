class ExportManager extends BaseModule {
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
                        setTimeout(resolve, this.constants?.ANIMATION.TIMEOUT_DELAY || 100);
                    });
                }
            } else {
                // Fallback for older browsers
                setTimeout(resolve, this.constants?.ANIMATION.TIMEOUT_DELAY || 100);
            }
        });
    }

    constructor() {
        super('ExportManager');
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.exportCanvas = null;
        this.exportCtx = null;
        this.exportAnimationId = null;
        this.vinylRotation = 0;
        this.albumArtImage = null;
        this.exportAudio = null;
        this.exportLyrics = [];
        // Use centralized lyrics color calculation
        this.exportLyricsColor = ColorHelper.calculateLyricsColor(window.Constants.PLAYER_BASE_COLOR);
        this.exportTimeout = null;
        this.wasMainAudioPlaying = false;
    }
    
    // Color methods are now handled by ColorHelper
    
    async initialize() {
        this.initializeUtils();
    }
    
    initializeUtils() {
        this.fileUtils = window.FileUtils;
        this.timeUtils = window.TimeUtils;
        this.logger = window.logger?.module('ExportManager') || console;
        this.errorHandler = window.errorHandler;
        this.constants = window.Constants;
        
        this.setupEventListeners();
    }
    
    async startExport(exportData) {
        const { audioFile, songTitle, artistName, albumArtFile } = exportData;
        
        if (this.appState.get('export.isExporting')) {
            const error = new Error('Export already in progress');
            this.errorHandler.handleExportError(error, 'ExportManager startExport');
            throw error;
        }
        
        try {
            this.logger.debug('Starting export process', { songTitle, artistName });
            this.appState.set('export.isExporting', true);
            this.appState.set('export.progress', 0);
            this.appState.set('export.message', 'Initializing export...');
            
            this.eventBus.emit('export:progress', { progress: 0, message: 'Initializing export...' });
            
            // Pause main audio if playing
            this.wasMainAudioPlaying = this.pauseMainAudio();
            
            // Disable controls
            this.disableControls();
            
            // Auto scroll to export progress immediately
            this.scrollToExportProgress();
            
            // Setup export timeout
            this.exportTimeout = this.setupExportTimeout(this.wasMainAudioPlaying);
            
            // Create export canvas
            this.createExportCanvas();
            
            // Setup export lyrics
            this.setupExportLyrics();
            
            // Setup export music player colors
            this.setupExportMusicPlayerColors();
            
            const loadingPromises = [];
            
            if (albumArtFile) {
                loadingPromises.push(this.loadAlbumArt(albumArtFile));
            }
            
            loadingPromises.push(this.loadExportAudio(audioFile));
            await Promise.all(loadingPromises);
            
            // Start recording
            await this.startRecording();
            
            // Start rendering loop
            this.startRenderingLoop();
            
            // Setup progress tracking
            this.setupProgressTracking();
            
            this.logger.debug('Export process started successfully');
            
        } catch (error) {
            this.errorHandler.handleExportError(error, 'ExportManager startExport');
            await this.handleExportError(error);
            throw error;
        }
    }
    
    createExportCanvas() {
        this.exportCanvas = document.createElement('canvas');
        
        let canvasWidth = this.constants?.EXPORT.DEFAULT_CANVAS_WIDTH || 720;
        let canvasHeight = this.constants?.EXPORT.DEFAULT_CANVAS_HEIGHT || 1280;
        
        // Try to get dimensions from various sources
        const dimensionSources = [
            () => {
                const vinylPlayer = DOMHelper.getElementSilent('.vinyl-player');
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
        
        this.exportCanvas.width = Math.max(canvasWidth, this.constants?.EXPORT.CANVAS_MIN_WIDTH || 400);
        this.exportCanvas.height = Math.max(canvasHeight, this.constants?.EXPORT.CANVAS_MIN_HEIGHT || 600);
        
        this.exportCtx = this.exportCanvas.getContext('2d');
        this.exportCtx.imageSmoothingEnabled = true;
        this.exportCtx.imageSmoothingQuality = 'high';
    }
    
    async loadAlbumArt(albumArtFile) {
        this.albumArtImage = new Image();
        this.albumArtImage.src = this.fileUtils.createObjectURL(albumArtFile);
        
        await new Promise((resolve, reject) => {
            this.albumArtImage.onload = resolve;
            this.albumArtImage.onerror = reject;
        });
    }
    
    async loadExportAudio(audioFile) {
        const audioUrl = this.fileUtils.createObjectURL(audioFile);
        this.exportAudio = new Audio(audioUrl);
        
        await new Promise((resolve, reject) => {
            this.exportAudio.addEventListener('loadedmetadata', resolve);
            this.exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), this.constants?.AUDIO.LOADING_TIMEOUT || 10000);
        });
    }
    
    setupExportLyrics() {
        this.exportLyrics = [...this.appState.get('lyrics.items')];
        
        if (window.lyricsColorManager) {
            this.exportLyricsColor = window.lyricsColorManager.getCurrentColor();
        }
    }
    
    setupExportMusicPlayerColors() {
        // Get current music player color variants
        if (window.musicPlayerThemeManager) {
            this.exportMusicPlayerColors = window.musicPlayerThemeManager.getCurrentVariants();
        } else {
            // Use centralized color calculation
            this.exportMusicPlayerColors = ColorHelper.calculatePlayerColorVariants(window.Constants.PLAYER_BASE_COLOR);
        }
    }
    
    async startRecording() {
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
        
        // Add error handling for media recorder
        this.mediaRecorder.onerror = (event) => {
            this.logger.error('MediaRecorder error:', event.error);
            this.handleExportError(new Error('Recording failed: ' + event.error));
        };
        
        this.mediaRecorder.start();
        
        // Ensure audio starts playing and add fallback
        try {
            await this.exportAudio.play();
        } catch (error) {
            this.logger.warn('Audio play failed, trying fallback:', error);
            // Fallback: try to play after a short delay
            setTimeout(() => {
                this.exportAudio.play().catch(e => {
                    this.logger.error('Fallback audio play failed:', e);
                });
            }, this.constants?.ANIMATION.TIMEOUT_DELAY || 100);
        }
    }
    
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
    
    startRenderingLoop() {
        let lastTime = performance.now();
        let animationStartTime = performance.now();
        let frameCount = 0;
        
        const renderLoop = (currentTime) => {
            try {
                // Update time tracking
                lastTime = currentTime;
                frameCount++;
                
                // Update vinyl rotation based on time
                // Use constants for rotation speed
                const rotationSpeed = this.constants?.ANIMATION.VINYL_ROTATION_SPEED || 0.03;
                const totalElapsed = currentTime - animationStartTime;
                this.vinylRotation = (totalElapsed * rotationSpeed) % 360;
                
                // Ensure rotation is always positive and continuous
                if (this.vinylRotation < 0) {
                    this.vinylRotation += 360;
                }
                
                // Force render even if audio is not ready
                if (window.ExportCanvas) {
                    window.ExportCanvas.renderToCanvas(
                        this.exportCtx,
                        this.exportCanvas,
                        this.vinylRotation,
                        this.albumArtImage,
                        this.exportAudio,
                        this.exportLyrics,
                        this.exportLyricsColor,
                        this.exportMusicPlayerColors
                    );
                }
                
                if (frameCount % (this.constants?.ANIMATION.FRAME_DEBUG_INTERVAL || 100) === 0) {
                    this.logger.debug(`Export frame ${frameCount}, rotation: ${this.vinylRotation.toFixed(2)}°, audio time: ${this.exportAudio?.currentTime || 0}s`);
                }
                
            } catch (error) {
                this.logger.error('Error in render loop:', error);
                // Continue animation even if there's an error
            }
            
            // Continue animation loop - ensure it never stops
            this.exportAnimationId = requestAnimationFrame(renderLoop);
        };
        
        // Start the loop
        this.exportAnimationId = requestAnimationFrame(renderLoop);
    }
    
    
    
    setupProgressTracking() {
        const duration = this.exportAudio.duration;
        const startTime = Date.now();
        
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min((elapsed / duration) * 100, 100);
            
            this.appState.set('export.progress', progress);
            this.appState.set('export.message', `Exporting... ${Math.round(progress)}%`);
            
            this.eventBus.emit('export:progress', { 
                progress: progress, 
                message: `Exporting... ${Math.round(progress)}%` 
            });
            
            if (elapsed >= duration) {
                clearInterval(progressInterval);
                this.stopRecording();
            }
        }, this.constants?.EXPORT.PROGRESS_UPDATE_INTERVAL || 100);
    }
    
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
    
    handleRecordingComplete() {
        // Clear export timeout since export is successful
        if (this.exportTimeout) {
            clearTimeout(this.exportTimeout);
            this.exportTimeout = null;
        }
        
        this.appState.set('export.progress', 100);
        this.appState.set('export.message', 'Processing video...');
        
        this.eventBus.emit('export:progress', { 
            progress: 100, 
            message: 'Processing video...' 
        });
        
        setTimeout(() => {
            const webmBlob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
            const songTitle = this.appState.get('ui.songTitle') || 'untitled';
            const fileName = `${this.fileUtils.sanitizeFilename(songTitle)}.webm`;
            
            this.appState.set('export.message', 'Export complete!');
            
            this.eventBus.emit('export:complete', {
                videoBlob: webmBlob,
                fileName: fileName,
                wasMainAudioPlaying: this.wasMainAudioPlaying
            });
            
            this.cleanup();
        }, 500);
    }
    
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
                    this.logger.warn('Failed to resume audio:', error);
                });
            }
        }
    }
    
    disableControls() {
        // Disable audio control buttons
        const controls = DOMHelper.getElements('.control-btn');
        controls.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        // Disable export button
        const exportBtn = DOMHelper.getElementSilent('#export-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
            exportBtn.style.cursor = 'not-allowed';
        }
    }
    
    enableControls() {
        // Enable audio control buttons
        const controls = DOMHelper.getElements('.control-btn');
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        // Enable export button
        const exportBtn = DOMHelper.getElementSilent('#export-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
            exportBtn.style.cursor = 'pointer';
        }
    }
    
    scrollToExportProgress() {
        const exportProgress = DOMHelper.getElementSilent('#export-progress');
        if (exportProgress) {
            exportProgress.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }
    
    updateExportProgress(data) {
        const exportProgress = DOMHelper.getElementSilent('#export-progress');
        const progressFill = DOMHelper.getElementSilent('#progress-fill');
        const progressText = DOMHelper.getElementSilent('#progress-text');
        
        if (exportProgress && progressFill && progressText) {
            exportProgress.style.display = 'block';
            progressFill.style.width = data.progress + '%';
            progressText.textContent = data.message;
        }
    }
    
    handleExportComplete(data) {
        const { videoBlob, fileName, wasMainAudioPlaying } = data;
        
        this.fileUtils.downloadBlob(videoBlob, fileName);
        
        // Resume main audio if it was playing
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = DOMHelper.getElementSilent('#export-progress');
        const progressFill = DOMHelper.getElementSilent('#progress-fill');
        const progressText = DOMHelper.getElementSilent('#progress-text');
        
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
    
    handleExportError(data) {
        const { wasMainAudioPlaying } = data;
        
        // Resume main audio if it was playing
        this.resumeMainAudio(wasMainAudioPlaying);
        
        const exportProgress = DOMHelper.getElementSilent('#export-progress');
        const progressFill = DOMHelper.getElementSilent('#progress-fill');
        const progressText = DOMHelper.getElementSilent('#progress-text');
        
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
    
    setupExportTimeout(wasMainAudioPlaying) {
        const timeout = this.constants?.EXPORT.EXPORT_TIMEOUT || 5 * 60 * 1000;
        return setTimeout(() => {
            const error = new Error('Export timeout. Please try again with a shorter audio file.');
            this.errorHandler.handleExportError(error, 'ExportManager timeout');
            this.handleExportError(error);
        }, timeout);
    }
    
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
    
    cleanup() {
        this.logger.debug('Cleaning up ExportManager resources');
        
        // Clear export timeout
        if (this.exportTimeout) {
            clearTimeout(this.exportTimeout);
            this.exportTimeout = null;
        }
        
        // Stop and cleanup audio
        if (this.exportAudio) {
            this.exportAudio.pause();
            this.exportAudio.src = '';
            this.exportAudio = null;
        }
        
        // Cleanup album art image and revoke object URL
        if (this.albumArtImage) {
            if (this.albumArtImage.src && this.albumArtImage.src.startsWith('blob:')) {
                this.fileUtils.revokeObjectURL(this.albumArtImage.src);
            }
            this.albumArtImage = null;
        }
        
        // Stop animation loop
        if (this.exportAnimationId) {
            cancelAnimationFrame(this.exportAnimationId);
            this.exportAnimationId = null;
        }
        
        // Cleanup media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.mediaRecorder = null;
        }
        
        // Clear recorded chunks
        this.recordedChunks = [];
        
        // Cleanup canvas
        if (this.exportCanvas) {
            this.exportCanvas = null;
            this.exportCtx = null;
        }
        
        this.enableControls();
        this.appState.set('export.isExporting', false);
        
        this.logger.debug('ExportManager cleanup completed');
    }
    
    setupEventListeners() {
        // Listen for export requests
        this.eventBus.on('export:requestStart', (data) => {
            this.startExport(data);
        });
        
        // Lyrics color is handled by LyricsManager
        
        // Export events are handled internally
    }
    
    
    destroy() {
        this.cleanup();
        this.eventBus.emit('export:destroyed');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}

window.ExportManager = ExportManager;
