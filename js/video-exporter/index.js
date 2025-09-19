/**
 * Video Exporter Index
 * Main entry point that loads all video exporter modules using ES6 imports
 */

// Import all video exporter modules
import { CanvasManager } from './canvas-manager.js';
import { AudioManager } from './audio-manager.js';
import { RecordingManager } from './recording-manager.js';
import { ProgressManager } from './progress-manager.js';
import { MessageManager } from './message-manager.js';
import { BrowserSupportManager } from './browser-support-manager.js';

// Import all renderers
import { BackgroundRenderer } from './renderers/background-renderer.js';
import { VinylRenderer } from './renderers/vinyl-renderer.js';
import { TonearmRenderer } from './renderers/tonearm-renderer.js';
import { AlbumArtRenderer } from './renderers/album-art-renderer.js';
import { SongInfoRenderer } from './renderers/song-info-renderer.js';
import { ProgressRenderer } from './renderers/progress-renderer.js';
import { ControlsRenderer } from './renderers/controls-renderer.js';

/**
 * Video Exporter Class
 * Main class that coordinates all managers and renderers
 */
class VideoExporter {
    constructor() {
        // Initialize managers
        this.canvasManager = new CanvasManager();
        this.audioManager = new AudioManager();
        this.recordingManager = new RecordingManager();
        this.progressManager = new ProgressManager();
        this.messageManager = new MessageManager();
        this.browserSupportManager = new BrowserSupportManager();
        
        // Initialize renderers
        this.backgroundRenderer = new BackgroundRenderer();
        this.vinylRenderer = new VinylRenderer();
        this.tonearmRenderer = new TonearmRenderer();
        this.albumArtRenderer = new AlbumArtRenderer();
        this.songInfoRenderer = new SongInfoRenderer();
        this.progressRenderer = new ProgressRenderer();
        this.controlsRenderer = new ControlsRenderer();
        
        // Export state
        this.albumArtImage = null;
        this.exportAnimationId = null;
        
        this.setupMessageHandlers();
    }

    /**
     * Setup message handlers
     */
    setupMessageHandlers() {
        this.messageManager.setLyricsColorCallback((color) => {
            this.audioManager.updateLyricsColor(color);
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            const { type } = message;
            
            switch (type) {
                case 'EXPORT_WEBM':
                    this.messageManager.handleExportRequest(message, (audioFile, songTitle, artistName, albumArtFile) => {
                        this.startVideoRecording(audioFile, songTitle, artistName, albumArtFile);
                    });
                    break;
                case 'DEBUG_BROWSER_SUPPORT':
                    this.browserSupportManager.debugBrowserSupport();
                    break;
            }
        });
    }

    /**
     * Start video recording
     * @param {File} audioFile - Audio file
     * @param {string} songTitle - Song title
     * @param {string} artistName - Artist name
     * @param {File} albumArtFile - Album art file
     */
    async startVideoRecording(audioFile, songTitle, artistName, albumArtFile) {
        if (this.recordingManager.isCurrentlyExporting()) {
            return;
        }
        this.recordingManager.setExporting(true);
        
        let wasMainAudioPlaying = false;
        if (window.vinylMusicPlayer && window.vinylMusicPlayer.audioElement && !window.vinylMusicPlayer.audioElement.paused) {
            wasMainAudioPlaying = true;
            window.vinylMusicPlayer.audioElement.pause();
            
            window.vinylMusicPlayer.isPlaying = false;
            window.vinylMusicPlayer.updatePlayerState();
        }
        
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        try {
            this.progressManager.reportProgress(5, 'Initializing export...');
            
            this.canvasManager.createExportCanvas();

            if (albumArtFile) {
                this.progressManager.reportProgress(15, 'Loading album art...');
                
                this.albumArtImage = new Image();
                this.albumArtImage.src = URL.createObjectURL(albumArtFile);
                await new Promise((resolve) => {
                    this.albumArtImage.onload = resolve;
                });
            }

            this.progressManager.reportProgress(15, 'Loading audio...');
            
            await this.audioManager.loadAudio(audioFile);
            this.audioManager.loadLyrics();
        
            this.progressManager.reportProgress(20, 'Setting up video recorder with audio...');
            
            const mimeType = await this.recordingManager.startRecording(
                this.canvasManager.getCanvas(),
                this.audioManager.getAudio(),
                {
                    onComplete: (webmBlob, mimeType) => {
                        const fileName = `${songTitle.replace(/[<>:"/\\|?*]/g, '')}.webm`;
                        this.progressManager.reportComplete(webmBlob, fileName);
                        
                        // Restore main audio playback state
                        if (wasMainAudioPlaying && window.vinylMusicPlayer && window.vinylMusicPlayer.audioElement) {
                            window.vinylMusicPlayer.audioElement.play().then(() => {
                                window.vinylMusicPlayer.isPlaying = true;
                                window.vinylMusicPlayer.updatePlayerState();
                            }).catch(error => {
                            });
                        }
                        
                        // Re-enable all control buttons
                        const controls = document.querySelectorAll('.control-btn');
                        controls.forEach(btn => {
                            btn.disabled = false;
                            btn.style.opacity = '1';
                            btn.style.cursor = 'pointer';
                        });
                        
                        this.recordingManager.setExporting(false);
                    }
                }
            );

            // Start recording
            this.progressManager.reportProgress(20, 'Starting recording...');
            
            // Start audio playback
            this.audioManager.play();

            // Start rendering loop
            const renderLoop = () => {
                this.renderToCanvas();
                this.exportAnimationId = requestAnimationFrame(renderLoop);
            };
            renderLoop();

            // Start progress tracking
            this.progressManager.startProgressTracking(
                this.audioManager.getAudio(),
                () => {
                    this.recordingManager.stopRecording();
                },
                (error) => {
                    this.progressManager.reportError(error);
                    this.cleanup();
                }
            );

        } catch (error) {
            this.progressManager.stopProgressTracking();
            
            // Clean up resources
            this.audioManager.cleanup();
            if (this.albumArtImage) {
                URL.revokeObjectURL(this.albumArtImage.src);
                this.albumArtImage = null;
            }
            if (this.exportAnimationId) {
                cancelAnimationFrame(this.exportAnimationId);
                this.exportAnimationId = null;
            }
            
            // Restore main audio playback state
            if (wasMainAudioPlaying && window.vinylMusicPlayer && window.vinylMusicPlayer.audioElement) {
                window.vinylMusicPlayer.audioElement.play().then(() => {
                    window.vinylMusicPlayer.isPlaying = true;
                    window.vinylMusicPlayer.updatePlayerState();
                }).catch(error => {
                });
            }
            
            // Re-enable all control buttons
            const controls = document.querySelectorAll('.control-btn');
            controls.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            this.recordingManager.setExporting(false);
            
            this.progressManager.reportError(error.message || 'Unknown error occurred');
        }
    }

    /**
     * Render vinyl player to canvas
     */
    renderToCanvas() {
        const ctx = this.canvasManager.getContext();
        if (!ctx) return;

        const dimensions = this.canvasManager.getDimensions();
        
        // Update vinyl rotation
        this.vinylRenderer.updateRotation();

        // Render background and get layout
        const layout = this.backgroundRenderer.render(ctx, dimensions);
        
        // Render vinyl and get vinyl layout
        const vinylLayout = this.vinylRenderer.render(ctx, layout);
        
        // Render album art
        this.albumArtRenderer.render(ctx, vinylLayout, layout, this.albumArtImage, this.vinylRenderer.vinylRotation);
        
        // Render tonearm
        this.tonearmRenderer.render(ctx, vinylLayout);
        
        // Render song info and get song info layout
        const songInfoLayout = this.songInfoRenderer.render(
            ctx, 
            vinylLayout, 
            layout, 
            this.audioManager.getAudio(), 
            this.audioManager.getLyrics(), 
            this.audioManager.getLyricsColor()
        );
        
        // Render progress and get progress layout
        const progressLayout = this.progressRenderer.render(ctx, layout, songInfoLayout, this.audioManager.getAudio());
        
        // Render controls
        this.controlsRenderer.render(ctx, layout, progressLayout, this.audioManager.getAudio());
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.exportAnimationId) {
            cancelAnimationFrame(this.exportAnimationId);
            this.exportAnimationId = null;
        }
        
        this.audioManager.cleanup();
        
        if (this.albumArtImage) {
            URL.revokeObjectURL(this.albumArtImage.src);
            this.albumArtImage = null;
        }
        
        this.recordingManager.setExporting(false);
    }
}

/**
 * Initialize the video exporter when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    window.videoExporter = new VideoExporter();
    // Make startVideoRecording available globally for backward compatibility
    window.startVideoRecording = (audioFile, songTitle, artistName, albumArtFile) => {
        return window.videoExporter.startVideoRecording(audioFile, songTitle, artistName, albumArtFile);
    };
});
