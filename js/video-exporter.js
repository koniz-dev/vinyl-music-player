/**
 * Video Exporter Module
 * Handles WebM video export functionality with canvas rendering
 */
export class VideoExporter {
    constructor() {
        // Export State Variables
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.exportCanvas = null;
        this.exportCtx = null;
        this.exportAnimationId = null;
        this.vinylRotation = 0;
        this.albumArtImage = null;
        this.exportAudio = null;
        this.exportLyrics = [];
        this.exportLyricsColor = '#ffb3d1'; // Default lyrics color
        this.isExporting = false;
        
        this.setupMessageListener();
    }

    createExportCanvas() {
        this.exportCanvas = document.createElement('canvas');
        
        let canvasWidth = 720;
        let canvasHeight = 1280;
        
        const dimensionSources = [
            () => {
                const vinylPlayer = document.querySelector('.vinyl-player-container');
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
            }
        }
        
        this.exportCanvas.width = Math.max(canvasWidth, 400);
        this.exportCanvas.height = Math.max(canvasHeight, 600);
        
        this.exportCtx = this.exportCanvas.getContext('2d');
        
        this.exportCtx.imageSmoothingEnabled = true;
        this.exportCtx.imageSmoothingQuality = 'high';
    }

    async startVideoRecording(audioFile, songTitle, artistName, albumArtFile) {
        if (this.isExporting) {
            return;
        }
        this.isExporting = true;
        
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
        
        let exportTimeout = null;
    
        try {
            exportTimeout = setTimeout(() => {
                if (wasMainAudioPlaying && window.vinylMusicPlayer && window.vinylMusicPlayer.audioElement) {
                    window.vinylMusicPlayer.audioElement.play().then(() => {
                        window.vinylMusicPlayer.isPlaying = true;
                        window.vinylMusicPlayer.updatePlayerState();
                    }).catch(error => {
                    });
                }
                
                const controls = document.querySelectorAll('.control-btn');
                controls.forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                });
                
                this.isExporting = false;
                
                window.postMessage({
                    type: 'EXPORT_ERROR',
                    error: 'Export timeout. Please try again with a shorter audio file.'
                }, '*');
            }, 5 * 60 * 1000);
            
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 5,
                message: 'Initializing export...'
            }, '*');
            
            
            this.createExportCanvas();

            if (albumArtFile) {
                window.postMessage({
                    type: 'EXPORT_PROGRESS',
                    progress: 15,
                    message: 'Loading album art...'
                }, '*');
                
                this.albumArtImage = new Image();
                this.albumArtImage.src = URL.createObjectURL(albumArtFile);
                await new Promise((resolve) => {
                    this.albumArtImage.onload = resolve;
                });
            }

            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 15,
                message: 'Loading audio...'
            }, '*');
            
            const audioUrl = URL.createObjectURL(audioFile);
            this.exportAudio = new Audio(audioUrl);
            
            this.exportLyrics = [...(window.vinylMusicPlayer ? window.vinylMusicPlayer.lyrics : [])];
            
            // Get current lyrics color from settings
            if (window.controlPanel && window.controlPanel.colorManager) {
                this.exportLyricsColor = window.controlPanel.colorManager.getCurrentColor();
            } else if (window.lyricsColorManager) {
                // Fallback for backward compatibility
                this.exportLyricsColor = window.lyricsColorManager.getCurrentColor();
            }
        
            await new Promise((resolve, reject) => {
                this.exportAudio.addEventListener('loadedmetadata', resolve);
                this.exportAudio.addEventListener('error', reject);
                setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
            });

            const canvasStream = this.exportCanvas.captureStream(30);
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(this.exportAudio);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
            ]);
            
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
                mimeType = 'video/webm;codecs=vp9,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                mimeType = 'video/webm;codecs=vp8,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                mimeType = 'video/webm;codecs=vp8';
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
                mimeType = 'video/webm';
            }
        
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 20,
                message: 'Setting up video recorder with audio...'
            }, '*');
            
            this.mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: mimeType
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                // Clear timeout
                if (exportTimeout) {
                    clearTimeout(exportTimeout);
                }
                
                const webmBlob = new Blob(this.recordedChunks, { type: mimeType });
                
                // Export as WebM
                const fileName = `${songTitle.replace(/[<>:"/\\|?*]/g, '')}.webm`;
                window.postMessage({
                    type: 'EXPORT_PROGRESS',
                    progress: 100,
                    message: 'WebM export complete!'
                }, '*');
                
                window.postMessage({
                    type: 'EXPORT_COMPLETE',
                    videoBlob: webmBlob,
                    fileName: fileName
                }, '*');
                
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
                
                // Reset export flag
                this.isExporting = false;
            };

            // Start recording
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 20,
                message: 'Starting recording...'
            }, '*');
            
            this.mediaRecorder.start();

            // Start audio playback
            this.exportAudio.play();

            // Don't reset vinyl rotation to maintain continuous rotation
            
            // Start rendering loop
            const renderLoop = () => {
                this.renderToCanvas();
                this.exportAnimationId = requestAnimationFrame(renderLoop);
            };
            renderLoop();

            // Update progress
            const duration = this.exportAudio.duration;
            const startTime = Date.now();
            
            const progressInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(20 + (elapsed / duration) * 60, 80);
                
                window.postMessage({
                    type: 'EXPORT_PROGRESS',
                    progress: progress,
                    message: `Recording... ${Math.round(progress)}%`
                }, '*');

                if (elapsed >= duration) {
                    clearInterval(progressInterval);
                    this.stopVideoRecording();
                }
            }, 100);

        } catch (error) {
            // Clear timeout
            if (exportTimeout) {
                clearTimeout(exportTimeout);
            }
            
            // Clean up resources
            if (this.exportAudio) {
                this.exportAudio.pause();
                this.exportAudio = null;
            }
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
                    // Audio resume failed silently
                });
            }
            
            // Re-enable all control buttons
            const controls = document.querySelectorAll('.control-btn');
            controls.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            // Reset export flag
            this.isExporting = false;
            
            window.postMessage({
                type: 'EXPORT_ERROR',
                error: error.message || 'Unknown error occurred'
            }, '*');
        }
    }

    // Stop video recording
    stopVideoRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        if (this.exportAnimationId) {
            cancelAnimationFrame(this.exportAnimationId);
            this.exportAnimationId = null;
        }
        
        if (this.exportAudio) {
            this.exportAudio.pause();
            this.exportAudio = null;
        }
        
        // Clean up album art image
        if (this.albumArtImage) {
            URL.revokeObjectURL(this.albumArtImage.src);
            this.albumArtImage = null;
        }
        
        // Reset export flag
        this.isExporting = false;
    }

    // Debug browser support
    debugBrowserSupport() {
        const support = {
            mediaRecorder: !!window.MediaRecorder,
            canvas: !!document.createElement('canvas').getContext,
            audio: !!window.Audio,
            webm: MediaRecorder.isTypeSupported('video/webm'),
            webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
            webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
            userAgent: navigator.userAgent
        };
        
        
        let message = 'Browser Support Check:\n\n';
        message += `MediaRecorder: ${support.mediaRecorder ? '✅' : '❌'}\n`;
        message += `Canvas: ${support.canvas ? '✅' : '❌'}\n`;
        message += `Audio: ${support.audio ? '✅' : '❌'}\n`;
        message += `WebM: ${support.webm ? '✅' : '❌'}\n`;
        message += `WebM VP8: ${support.webm_vp8 ? '✅' : '❌'}\n`;
        message += `WebM VP9: ${support.webm_vp9 ? '✅' : '❌'}\n`;
        message += `Browser: ${navigator.userAgent.split(' ')[0]}`;
        
        alert(message);
    }

    /**
     * Setup message listener for lyrics color updates
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'UPDATE_LYRICS_COLOR') {
                this.exportLyricsColor = event.data.color;
            }
        });
    }

    // Render vinyl player to canvas
    renderToCanvas() {
        if (!this.exportCtx) return;

        // Update vinyl rotation (slower, more natural vinyl rotation)
        // Always rotate during export regardless of audio state
        this.vinylRotation += 0.3;

        // Create body background gradient (exact match with CSS)
        // background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)
        const bodyGradient = this.exportCtx.createLinearGradient(0, 0, this.exportCanvas.width, this.exportCanvas.height);
        bodyGradient.addColorStop(0, '#667eea'); // 0%
        bodyGradient.addColorStop(0.25, '#764ba2'); // 25%
        bodyGradient.addColorStop(0.5, '#f093fb'); // 50%
        bodyGradient.addColorStop(0.75, '#f5576c'); // 75%
        bodyGradient.addColorStop(1, '#4facfe'); // 100%
        
        // Fill with body gradient background
        this.exportCtx.fillStyle = bodyGradient;
        this.exportCtx.fillRect(0, 0, this.exportCanvas.width, this.exportCanvas.height);
    
    // Create right panel (exact match with CSS .right-panel)
    // background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2)
    const rightPanelWidth = this.exportCanvas.width;
    const rightPanelHeight = this.exportCanvas.height;
    const rightPanelX = 0;
    const rightPanelY = 0;
    
    this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.exportCtx.fillRect(rightPanelX, rightPanelY, rightPanelWidth, rightPanelHeight);
    
    // Create vinyl player container (exact match with CSS .vinyl-player-container)
    // width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    const vinylPlayerContainerWidth = rightPanelWidth;
    const vinylPlayerContainerHeight = rightPanelHeight;
    const vinylPlayerContainerX = rightPanelX;
    const vinylPlayerContainerY = rightPanelY;
    
    // Create music player (exact match with CSS .music-player)
    // width: 350px; height: 600px; background: rgba(0, 0, 0, 0.4); border-radius: 30px;
    const musicPlayerWidth = Math.min(this.exportCanvas.width * 0.9, 350);
    const musicPlayerHeight = Math.min(this.exportCanvas.height * 0.9, 600);
    const musicPlayerX = vinylPlayerContainerX + (vinylPlayerContainerWidth - musicPlayerWidth) / 2;
    const musicPlayerY = vinylPlayerContainerY + (vinylPlayerContainerHeight - musicPlayerHeight) / 2;
    
    // Add rounded corners effect (like CSS border-radius: 30px)
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
    
    // Draw album art background if available (exact match with CSS - no blur effects)
    if (this.albumArtImage) {
        // Calculate proper scaling to cover entire music player area
        const imgAspect = this.albumArtImage.width / this.albumArtImage.height;
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
        
        this.exportCtx.drawImage(this.albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    // Music player background (exact match with CSS)
    // background: rgba(0, 0, 0, 0.4) - removed shadow effects
    this.exportCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.exportCtx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
    
    this.exportCtx.restore();

    // Create vinyl section (exact match with CSS .vinyl-section)
    // flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    const vinylSectionWidth = musicPlayerWidth;
    const vinylSectionHeight = musicPlayerHeight * 0.7; // flex: 1 takes most space
    const vinylSectionX = musicPlayerX;
    const vinylSectionY = musicPlayerY;
    
    // Create vinyl container (exact match with CSS .vinyl-container)
    // position: relative; width: 200px; height: 200px; margin-bottom: 30px;
    const vinylContainerWidth = 200;
    const vinylContainerHeight = 200;
    const vinylContainerX = vinylSectionX + (vinylSectionWidth - vinylContainerWidth) / 2;
    const vinylContainerY = vinylSectionY + (vinylSectionHeight - vinylContainerHeight) / 2 - 20; // Better centered positioning
    
    // Draw vinyl record (centered within vinyl container) - matching CSS exactly
    const centerX = vinylContainerX + vinylContainerWidth / 2;
    const centerY = vinylContainerY + vinylContainerHeight / 2;
    const vinylRadius = vinylContainerWidth / 2; // 200px / 2 = 100px

    // Vinyl record (exact match with CSS .vinyl-record)
    // background: radial-gradient(circle at center, #2a2a2a 20%, #1a1a1a 40%, #000 80%)
    // with silver highlights for 3D effect
    
    // Apply vinyl rotation (always rotate during export)
    // Animation is added via JS when playing: vinyl.style.animation = 'spin 8s linear infinite'
    this.exportCtx.save();
    this.exportCtx.translate(centerX, centerY);
    this.exportCtx.rotate((this.vinylRotation * Math.PI) / 180);
    this.exportCtx.translate(-centerX, -centerY);
    
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
    
    this.exportCtx.restore();
    
    // Draw vinyl grooves (exact match with CSS .vinyl-grooves)
    // border: 1px solid rgba(255, 255, 255, 0.1)
    this.exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.exportCtx.lineWidth = 1;
    
    // Apply same rotation to grooves (always rotate during export)
    this.exportCtx.save();
    this.exportCtx.translate(centerX, centerY);
    this.exportCtx.rotate((this.vinylRotation * Math.PI) / 180);
    this.exportCtx.translate(-centerX, -centerY);
    
    // Groove 1: width: 200px; height: 200px; top: 25px; left: 25px;
    const groove1Radius = vinylRadius * 0.8;
    this.exportCtx.beginPath();
    this.exportCtx.arc(centerX, centerY, groove1Radius, 0, 2 * Math.PI);
    this.exportCtx.stroke();
    
    // Groove 2: width: 170px; height: 170px; top: 40px; left: 40px;
    const groove2Radius = vinylRadius * 0.68;
    this.exportCtx.beginPath();
    this.exportCtx.arc(centerX, centerY, groove2Radius, 0, 2 * Math.PI);
    this.exportCtx.stroke();
    
    // Groove 3: width: 140px; height: 140px; top: 55px; left: 55px;
    const groove3Radius = vinylRadius * 0.56;
    this.exportCtx.beginPath();
    this.exportCtx.arc(centerX, centerY, groove3Radius, 0, 2 * Math.PI);
    this.exportCtx.stroke();
    
    this.exportCtx.restore();


    // Vinyl center with CSS styling (like CSS .vinyl-center)
    const centerRadius = vinylRadius * 0.48; // 96px for 200px vinyl (like CSS width: 96px)
    
    // Vinyl center background (exact match with CSS)
    // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
    const centerGradient = this.exportCtx.createLinearGradient(centerX - centerRadius, centerY - centerRadius, centerX + centerRadius, centerY + centerRadius);
    centerGradient.addColorStop(0, '#667eea'); // 0%
    centerGradient.addColorStop(1, '#764ba2'); // 100%
    
    // Vinyl center - removed shadow effects
    
    this.exportCtx.fillStyle = centerGradient;
    this.exportCtx.beginPath();
    this.exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    this.exportCtx.fill();
    
    // Add glassmorphism highlight to center
    const centerHighlight = this.exportCtx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0, centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8);
    centerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    centerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    centerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.exportCtx.fillStyle = centerHighlight;
    this.exportCtx.beginPath();
    this.exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    this.exportCtx.fill();
    
    // Album art with exact CSS styling (like CSS .album-art)
    const albumArtRadius = centerRadius * 0.83; // 100px for 120px center (like CSS width: 100px)
    if (this.albumArtImage) {
        // Album art - exact match with CSS: width: 100px; height: 100px; border-radius: 50%; object-fit: cover;
        
        this.exportCtx.save();
        this.exportCtx.beginPath();
        this.exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        this.exportCtx.clip();
        
        // Apply vinyl rotation to album art (rotate with vinyl)
        this.exportCtx.save();
        this.exportCtx.translate(centerX, centerY);
        this.exportCtx.rotate((this.vinylRotation * Math.PI) / 180);
        this.exportCtx.translate(-centerX, -centerY);
        
        // Draw album art with rotation
        this.exportCtx.drawImage(this.albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                          albumArtRadius * 2, albumArtRadius * 2);
        
        this.exportCtx.restore();
        this.exportCtx.restore();
    } else {
        // Default album art placeholder with custom SVG image (like CSS background)
        const customSvgImage = new Image();
        customSvgImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><circle cx="50" cy="50" r="45" fill="url(%23g)"/><path d="M30 40 Q35 35 40 40 L45 50 Q50 45 55 50 L60 60 Q55 65 50 60 L45 50 Q40 55 35 50 Z" fill="white" opacity="0.8"/></svg>';
        
        // Apply vinyl rotation to custom SVG image (rotate with vinyl)
        this.exportCtx.save();
        this.exportCtx.translate(centerX, centerY);
        this.exportCtx.rotate((this.vinylRotation * Math.PI) / 180);
        this.exportCtx.translate(-centerX, -centerY);
        
        // Draw custom SVG image with rotation
        this.exportCtx.drawImage(customSvgImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                          albumArtRadius * 2, albumArtRadius * 2);
        
        this.exportCtx.restore();
    }

    // Draw tonearm after album art (exact match with CSS .tonearm)
    // position: absolute; top: 16px; right: 16px; width: 3px; height: 96px;
    // background: linear-gradient(to bottom, #fff, #ccc); transform: rotate(25deg);
    // Calculate tonearm position to match CSS: top: 16px; right: 16px from vinyl container
    const tonearmX = vinylContainerX + vinylContainerWidth - 16; // right: 16px from container
    const tonearmY = vinylContainerY + 16; // top: 16px from container
    const tonearmLength = 96; // height: 96px as per CSS
    
    this.exportCtx.save();
    this.exportCtx.translate(tonearmX, tonearmY);
    this.exportCtx.rotate(25 * Math.PI / 180); // 25 degrees like CSS
    
    // Draw tonearm as one seamless piece
    // First, draw the main tonearm body with gradient
    const tonearmGradient = this.exportCtx.createLinearGradient(0, 0, 0, tonearmLength);
    tonearmGradient.addColorStop(0, '#fff');
    tonearmGradient.addColorStop(1, '#ccc');
    
    this.exportCtx.fillStyle = tonearmGradient;
    this.exportCtx.fillRect(-1.5, 0, 3, tonearmLength);
    
    // Draw pivot as part of tonearm body (seamless connection)
    this.exportCtx.fillStyle = '#fff';
    this.exportCtx.beginPath();
    this.exportCtx.arc(-1.5, 0, 5, 0, 2 * Math.PI); // Connected to tonearm body
    this.exportCtx.fill();
    
    // Draw needle as part of tonearm body (seamless connection)
    this.exportCtx.fillStyle = '#666';
    this.exportCtx.fillRect(-2, tonearmLength - 5, 6, 10); // Connected to tonearm body
    
    this.exportCtx.restore();

    // Create song info (exact match with CSS .song-info)
    // text-align: center; color: white;
    const songInfoX = vinylSectionX;
    const songInfoY = vinylContainerY + vinylContainerHeight + 40; // Lower lyrics position
    const songInfoWidth = vinylSectionWidth;
    const songInfoHeight = 100;
    
    // Get song info from DOM
    const songTitle = document.querySelector('.vinyl-song-title').textContent;
    const artistName = document.querySelector('.vinyl-artist-name').textContent;
    const lyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

    // Song title (exact match with CSS .vinyl-song-title)
    // font-size: 24px; font-weight: bold; margin-top: 16px; letter-spacing: 2px;
    this.exportCtx.fillStyle = '#ffffff';
    this.exportCtx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`;
    this.exportCtx.textAlign = 'center';
    this.exportCtx.fillText(songTitle, songInfoX + songInfoWidth / 2, songInfoY);

    if (artistName) {
        // Artist name (exact match with CSS .vinyl-artist-name)
        // font-size: 16px; color: rgba(255, 255, 255, 0.9); font-weight: 400; letter-spacing: 1px;
        this.exportCtx.font = `16px 'Patrick Hand', Arial, sans-serif`;
        this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.exportCtx.fillText(artistName, songInfoX + songInfoWidth / 2, songInfoY + 25);
    }

    // Display current lyrics based on audio time (exact match with CSS .vinyl-lyrics-text)
    // font-size: 18px; color: #ffd700; text-align: center; margin-top: 10px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    if (this.exportAudio && this.exportLyrics.length > 0) {
        const currentTime = this.exportAudio.currentTime;
        const currentLyric = this.exportLyrics.find(lyric => 
            currentTime >= lyric.start && currentTime <= lyric.end
        );
        
        if (currentLyric) {
            this.exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`;
            this.exportCtx.fillStyle = this.exportLyricsColor;
            this.exportCtx.fillText(currentLyric.text, songInfoX + songInfoWidth / 2, songInfoY + 60);
        }
    } else if (lyricsText) {
        this.exportCtx.font = `20px 'Patrick Hand', Arial, sans-serif`;
        this.exportCtx.fillStyle = this.exportLyricsColor;
        this.exportCtx.fillText(lyricsText, songInfoX + songInfoWidth / 2, songInfoY + 60);
    }

    // Create progress container (exact match with CSS .progress-container)
    // width: 100%; padding: 0 30px;
    const progressContainerWidth = musicPlayerWidth;
    const progressContainerHeight = 50;
    const progressContainerX = musicPlayerX;
    const progressContainerY = songInfoY + 80; // Position below lyrics (raised 40px)
    
    // Draw progress bar (exact match with CSS .vinyl-progress-bar)
    // width: 100%; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px;
    const progressBarWidth = progressContainerWidth - 60; // padding: 0 30px
    const progressBarHeight = 4; // Original height
    const progressBarX = progressContainerX + 30; // padding-left: 30px
    const progressBarY = progressContainerY + 10;
    
    // Progress bar background with better border-radius
    // background: rgba(255, 255, 255, 0.2); border-radius: 2px;
    this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.exportCtx.save();
    this.exportCtx.beginPath();
    const bgRadius = 2; // Original border-radius matching height
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
    
    // Progress bar fill (exact match with CSS .progress)
    // background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px;
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
    const fillRadius = 2; // Original border-radius to match background
    this.exportCtx.moveTo(progressBarX + fillRadius, progressBarY);
    this.exportCtx.lineTo(progressBarX + progressWidth - fillRadius, progressBarY);
    this.exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY, progressBarX + progressWidth, progressBarY + fillRadius);
    this.exportCtx.lineTo(progressBarX + progressWidth, progressBarY + progressBarHeight - fillRadius);
    this.exportCtx.quadraticCurveTo(progressBarX + progressWidth, progressBarY + progressBarHeight, progressBarX + progressWidth - fillRadius, progressBarY + progressBarHeight);
    this.exportCtx.lineTo(progressBarX + fillRadius, progressBarY + progressBarHeight);
    this.exportCtx.quadraticCurveTo(progressBarX, progressBarY + progressBarHeight, progressBarX, progressBarY + progressBarHeight - fillRadius);
    this.exportCtx.lineTo(progressBarX, progressBarY + fillRadius);
    this.exportCtx.quadraticCurveTo(progressBarX, progressBarY, progressBarX + fillRadius, progressBarY);
    this.exportCtx.fill();
    this.exportCtx.restore();
    
    // Scrubber thumb (CSS doesn't show thumb, but we'll add a subtle one)
    const thumbX = progressBarX + progressWidth;
    const thumbY = progressBarY + progressBarHeight / 2;
    const thumbRadius = 4; // Smaller thumb
    
    // Thumb body (no shadow, subtle)
    this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.exportCtx.beginPath();
    this.exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
    this.exportCtx.fill();
    
    // Time labels (exact match with CSS .progress-time)
    // display: flex; justify-content: space-between; color: rgba(255, 255, 255, 0.7); font-size: 12px; margin-top: 8px;
    this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.exportCtx.font = `12px 'Patrick Hand', Arial, sans-serif`;
    this.exportCtx.textAlign = 'left';
    
    // Format time helper function
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Current time (dynamic if audio is available)
    const currentTime = this.exportAudio && !isNaN(this.exportAudio.currentTime) ? this.exportAudio.currentTime : 0;
    const totalTime = this.exportAudio && !isNaN(this.exportAudio.duration) ? this.exportAudio.duration : 0;
    
    this.exportCtx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
    
    this.exportCtx.textAlign = 'right';
    this.exportCtx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);
    
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
    const playIcon = (this.exportAudio && !this.exportAudio.paused) ? '⏸' : '▶';
    const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];
    
    // Control buttons (exact match with CSS .control-btn)
    let currentX = startButtonX;
    
    for (let i = 0; i < 5; i++) {
        // Special styling for play button (exact match with CSS .vinyl-play-pause-btn)
        if (i === 2) { // Play button is at index 2
            // width: 70px !important; height: 70px !important; font-size: 28px !important; background: rgba(255, 255, 255, 0.15) !important;
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
            
            // Move to next position
            currentX += playButtonSize + buttonSpacing;
        } else {
            // Regular button styling - center them with the play button
            // background: rgba(255, 255, 255, 0.1)
            const buttonX = currentX + buttonSize/2;
            const buttonYCenter = buttonY + playButtonSize/2; // Align with play button center
            
            this.exportCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.exportCtx.beginPath();
            this.exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
            this.exportCtx.fill();
            
            this.exportCtx.fillStyle = '#ffffff';
            this.exportCtx.font = `${buttonSize * 0.4}px Arial`;
            this.exportCtx.textAlign = 'center';
            this.exportCtx.textBaseline = 'middle';
            this.exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
            
            // Move to next position
            currentX += buttonSize + buttonSpacing;
        }
    }
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
