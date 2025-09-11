// Export MP4 functionality
let mediaRecorder = null;
let recordedChunks = [];
let exportCanvas = null;
let exportCtx = null;
let exportAnimationId = null;
let vinylRotation = 0;
let albumArtImage = null;
let exportAudio = null;
let exportLyrics = [];
// isExporting is declared in vinyl-player.js

// Create export canvas
function createExportCanvas() {
    exportCanvas = document.createElement('canvas');
    
    // Get canvas dimensions with fallback system
    let canvasWidth = 720; // Default fallback
    let canvasHeight = 1280; // Default fallback
    
    // Try to get dimensions from various sources
    const dimensionSources = [
        // 1. Vinyl player dimensions
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
        // 2. Iframe dimensions
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
        // 3. Window dimensions with aspect ratio
        () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            if (windowWidth > 0 && windowHeight > 0) {
                const aspectRatio = 9 / 16; // Mobile portrait ratio
                if (windowWidth / windowHeight > aspectRatio) {
                    return { width: windowHeight * aspectRatio, height: windowHeight };
                } else {
                    return { width: windowWidth, height: windowWidth / aspectRatio };
                }
            }
            return null;
        }
    ];
    
    // Try each source until we get valid dimensions
    for (const getDimensions of dimensionSources) {
        try {
            const dimensions = getDimensions();
            if (dimensions) {
                canvasWidth = dimensions.width;
                canvasHeight = dimensions.height;
                break; // Found valid dimensions, stop trying
            }
        } catch (e) {
            // Continue to next source
        }
    }
    
    // Ensure minimum dimensions for quality
    exportCanvas.width = Math.max(canvasWidth, 400);
    exportCanvas.height = Math.max(canvasHeight, 600);
    
    exportCtx = exportCanvas.getContext('2d');
    
    // Set canvas style for better rendering
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';
}

// Start video recording
async function startVideoRecording(audioFile, songTitle, artistName, albumArtFile) {
    // Prevent duplicate exports
    if (isExporting) {
        return;
    }
    isExporting = true;
    
    // Store current audio state and pause main audio to prevent conflicts
    let wasMainAudioPlaying = false;
    if (audioElement && !audioElement.paused) {
        wasMainAudioPlaying = true;
        audioElement.pause();
        
        // Update UI to reflect paused state
        isPlaying = false;
        updatePlayerState();
        stopProgressTimer();
        stopLyricsTimer();
    }
    
    // Disable all control buttons during export
    const controls = document.querySelectorAll('.control-btn');
    controls.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    let exportTimeout = null;
    
    try {
        // Set overall timeout (5 minutes)
        exportTimeout = setTimeout(() => {
            // Restore main audio playback state
            if (wasMainAudioPlaying && audioElement) {
                audioElement.play().then(() => {
                    isPlaying = true;
                    updatePlayerState();
                    startProgressTimer();
                    startLyricsTimer();
                }).catch(error => {
                    console.log('Could not resume main audio:', error);
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
            isExporting = false;
            
            window.postMessage({
                type: 'EXPORT_ERROR',
                error: 'Export timeout. Please try again with a shorter audio file.'
            }, '*');
        }, 5 * 60 * 1000);
        
        // Send initial progress update
        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 5,
            message: 'Initializing export...'
        }, '*');
        
        // Create export canvas
        createExportCanvas();

        // Load album art if provided
        if (albumArtFile) {
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 10,
                message: 'Loading album art...'
            }, '*');
            
            albumArtImage = new Image();
            albumArtImage.src = URL.createObjectURL(albumArtFile);
            await new Promise((resolve) => {
                albumArtImage.onload = resolve;
            });
        }

        // Create audio element for recording
        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 15,
            message: 'Loading audio...'
        }, '*');
        
        const audioUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioUrl);
        
        // Store current lyrics for export
        exportLyrics = [...lyrics];
        
        // Wait for audio to load
        await new Promise((resolve, reject) => {
            exportAudio.addEventListener('loadedmetadata', resolve);
            exportAudio.addEventListener('error', reject);
            // Timeout after 10 seconds
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        // Create MediaRecorder with audio
        const canvasStream = exportCanvas.captureStream(30); // 30 FPS
        
        // Create audio context and connect to audio element
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(exportAudio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        // Remove connection to audioContext.destination to prevent audio output to speakers
        
        // Combine video and audio streams
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);
        
        // Check for supported MIME types
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
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
        }
        
        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 20,
            message: 'Setting up video recorder with audio...'
        }, '*');
        
        mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: mimeType
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = function() {
            // Clear timeout
            if (exportTimeout) {
                clearTimeout(exportTimeout);
            }
            
            const blob = new Blob(recordedChunks, { type: mimeType });
            
            // Convert to MP4 using FFmpeg.js (we'll use a simpler approach)
            // For now, we'll export as WebM and let the user convert if needed
            const fileName = `${songTitle.replace(/[<>:"/\\|?*]/g, '')}.webm`;
            
            // Send completion message to settings
            try {
                // Send to same window since this is a single page app
                window.postMessage({
                    type: 'EXPORT_COMPLETE',
                    videoBlob: blob,
                    fileName: fileName
                }, '*');
                
            } catch (e) {
                console.error('Error sending completion message:', e);
            }
            
            // Restore main audio playback state
            if (wasMainAudioPlaying && audioElement) {
                audioElement.play().then(() => {
                    isPlaying = true;
                    updatePlayerState();
                    startProgressTimer();
                    startLyricsTimer();
                }).catch(error => {
                    console.log('Could not resume main audio:', error);
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
            isExporting = false;
        };

        // Start recording
        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 25,
            message: 'Starting recording...'
        }, '*');
        
        mediaRecorder.start();

        // Start audio playback
        exportAudio.play();

        // Don't reset vinyl rotation to maintain continuous rotation
        
        // Start rendering loop
        function renderLoop() {
            renderToCanvas();
            exportAnimationId = requestAnimationFrame(renderLoop);
        }
        renderLoop();

        // Update progress
        const duration = exportAudio.duration;
        const startTime = Date.now();
        
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min((elapsed / duration) * 100, 100);
            
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: progress,
                message: `Recording... ${Math.round(progress)}%`
            }, '*');

            if (elapsed >= duration) {
                clearInterval(progressInterval);
                stopVideoRecording();
            }
        }, 100);

    } catch (error) {
        // Clear timeout
        if (exportTimeout) {
            clearTimeout(exportTimeout);
        }
        
        // Clean up resources
        if (exportAudio) {
            exportAudio.pause();
            exportAudio = null;
        }
        if (albumArtImage) {
            URL.revokeObjectURL(albumArtImage.src);
            albumArtImage = null;
        }
        if (exportAnimationId) {
            cancelAnimationFrame(exportAnimationId);
            exportAnimationId = null;
        }
        
        // Restore main audio playback state
        if (wasMainAudioPlaying && audioElement) {
            audioElement.play().then(() => {
                isPlaying = true;
                updatePlayerState();
                startProgressTimer();
                startLyricsTimer();
            }).catch(error => {
                console.log('Could not resume main audio:', error);
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
        isExporting = false;
        
        window.postMessage({
            type: 'EXPORT_ERROR',
            error: error.message || 'Unknown error occurred'
        }, '*');
    }
}

// Stop video recording
function stopVideoRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    if (exportAnimationId) {
        cancelAnimationFrame(exportAnimationId);
        exportAnimationId = null;
    }
    
    if (exportAudio) {
        exportAudio.pause();
        exportAudio = null;
    }
    
    // Clean up album art image
    if (albumArtImage) {
        URL.revokeObjectURL(albumArtImage.src);
        albumArtImage = null;
    }
    
    // Reset export flag
    isExporting = false;
}

// Debug browser support
function debugBrowserSupport() {
    const support = {
        mediaRecorder: !!window.MediaRecorder,
        canvas: !!document.createElement('canvas').getContext,
        audio: !!window.Audio,
        webm: MediaRecorder.isTypeSupported('video/webm'),
        webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
        mp4: MediaRecorder.isTypeSupported('video/mp4'),
        userAgent: navigator.userAgent
    };
    
    console.log('Browser Support Debug:', support);
    
    let message = 'Browser Support Check:\n\n';
    message += `MediaRecorder: ${support.mediaRecorder ? '✅' : '❌'}\n`;
    message += `Canvas: ${support.canvas ? '✅' : '❌'}\n`;
    message += `Audio: ${support.audio ? '✅' : '❌'}\n`;
    message += `WebM: ${support.webm ? '✅' : '❌'}\n`;
    message += `WebM VP8: ${support.webm_vp8 ? '✅' : '❌'}\n`;
    message += `WebM VP9: ${support.webm_vp9 ? '✅' : '❌'}\n`;
    message += `MP4: ${support.mp4 ? '✅' : '❌'}\n\n`;
    message += `Browser: ${navigator.userAgent.split(' ')[0]}`;
    
    alert(message);
}

// Render vinyl player to canvas
function renderToCanvas() {
    if (!exportCtx) return;

    // Update vinyl rotation (faster rotation for export)
    // Always update rotation when audio is loaded, regardless of play state
    if (exportAudio && exportAudio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        vinylRotation += 2.0;
    }

    // Create body background gradient (exact match with CSS)
    // background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)
    const bodyGradient = exportCtx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
    bodyGradient.addColorStop(0, '#667eea'); // 0%
    bodyGradient.addColorStop(0.25, '#764ba2'); // 25%
    bodyGradient.addColorStop(0.5, '#f093fb'); // 50%
    bodyGradient.addColorStop(0.75, '#f5576c'); // 75%
    bodyGradient.addColorStop(1, '#4facfe'); // 100%
    
    // Fill with body gradient background
    exportCtx.fillStyle = bodyGradient;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Create right panel (exact match with CSS .right-panel)
    // background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2)
    const rightPanelWidth = exportCanvas.width;
    const rightPanelHeight = exportCanvas.height;
    const rightPanelX = 0;
    const rightPanelY = 0;
    
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    exportCtx.fillRect(rightPanelX, rightPanelY, rightPanelWidth, rightPanelHeight);
    
    // Create vinyl player container (exact match with CSS .vinyl-player-container)
    // width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    const vinylPlayerContainerWidth = rightPanelWidth;
    const vinylPlayerContainerHeight = rightPanelHeight;
    const vinylPlayerContainerX = rightPanelX;
    const vinylPlayerContainerY = rightPanelY;
    
    // Create music player (exact match with CSS .music-player)
    // width: 350px; height: 600px; background: rgba(0, 0, 0, 0.4); border-radius: 30px;
    const musicPlayerWidth = Math.min(exportCanvas.width * 0.9, 350);
    const musicPlayerHeight = Math.min(exportCanvas.height * 0.9, 600);
    const musicPlayerX = vinylPlayerContainerX + (vinylPlayerContainerWidth - musicPlayerWidth) / 2;
    const musicPlayerY = vinylPlayerContainerY + (vinylPlayerContainerHeight - musicPlayerHeight) / 2;
    
    // Add rounded corners effect (like CSS border-radius: 30px)
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
    
    // Music player background (exact match with CSS)
    // background: rgba(0, 0, 0, 0.4) - removed shadow effects
    exportCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    exportCtx.fillRect(musicPlayerX, musicPlayerY, musicPlayerWidth, musicPlayerHeight);
    
    // Draw blurred album art background if available (glassmorphism effect)
    if (albumArtImage) {
        exportCtx.save();
        exportCtx.filter = 'blur(40px) brightness(0.6) saturate(1.3)';
        
        // Calculate proper scaling to cover entire canvas
        const imgAspect = albumArtImage.width / albumArtImage.height;
        const canvasAspect = exportCanvas.width / exportCanvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
            drawHeight = exportCanvas.height + 300;
            drawWidth = drawHeight * imgAspect;
            offsetX = (exportCanvas.width - drawWidth) / 2;
            offsetY = -150;
        } else {
            drawWidth = exportCanvas.width + 300;
            drawHeight = drawWidth / imgAspect;
            offsetX = -150;
            offsetY = (exportCanvas.height - drawHeight) / 2;
        }
        
        exportCtx.drawImage(albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
        exportCtx.restore();
        
        // Add glassmorphism overlay with gradient
        const overlayGradient = exportCtx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        overlayGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        exportCtx.fillStyle = overlayGradient;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Add subtle white overlay for glassmorphism effect
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }
    
    exportCtx.restore();

    // Create vinyl section (exact match with CSS .vinyl-section)
    // flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    const vinylSectionWidth = musicPlayerWidth;
    const vinylSectionHeight = musicPlayerHeight * 0.7; // flex: 1 takes most space
    const vinylSectionX = musicPlayerX;
    const vinylSectionY = musicPlayerY;
    
    // Create vinyl container (exact match with CSS .vinyl-container)
    // position: relative; width: 250px; height: 250px; margin-bottom: 30px;
    const vinylContainerWidth = 250;
    const vinylContainerHeight = 250;
    const vinylContainerX = vinylSectionX + (vinylSectionWidth - vinylContainerWidth) / 2;
    const vinylContainerY = vinylSectionY + (vinylSectionHeight - vinylContainerHeight) / 2 - 20; // Better centered positioning
    
    // Draw vinyl record (centered within vinyl container) - matching CSS exactly
    const centerX = vinylContainerX + vinylContainerWidth / 2;
    const centerY = vinylContainerY + vinylContainerHeight / 2;
    const vinylRadius = vinylContainerWidth / 2; // 250px / 2 = 125px

    // Vinyl record (exact match with CSS .vinyl-record)
    // background: radial-gradient(circle at center, #1a1a1a 30%, #000 70%)
    // removed shadow effects
    
    // Apply vinyl rotation when audio is loaded and playing
    // Animation is added via JS when playing: vinyl.style.animation = 'spin 8s linear infinite'
    if (exportAudio && exportAudio.readyState >= 2 && !exportAudio.paused) {
        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((vinylRotation * Math.PI) / 180);
        exportCtx.translate(-centerX, -centerY);
    }
    
    const vinylGradient = exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
    vinylGradient.addColorStop(0, '#1a1a1a');
    vinylGradient.addColorStop(0.3, '#1a1a1a');
    vinylGradient.addColorStop(0.7, '#000000');
    vinylGradient.addColorStop(1, '#000000');
    
    exportCtx.fillStyle = vinylGradient;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    if (exportAudio && exportAudio.readyState >= 2 && !exportAudio.paused) {
        exportCtx.restore();
    }
    
    // Draw vinyl grooves (exact match with CSS .vinyl-grooves)
    // border: 1px solid rgba(255, 255, 255, 0.1)
    exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    exportCtx.lineWidth = 1;
    
    // Apply same rotation to grooves only when playing
    if (exportAudio && exportAudio.readyState >= 2 && !exportAudio.paused) {
        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((vinylRotation * Math.PI) / 180);
        exportCtx.translate(-centerX, -centerY);
    }
    
    // Groove 1: width: 200px; height: 200px; top: 25px; left: 25px;
    const groove1Radius = vinylRadius * 0.8;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, groove1Radius, 0, 2 * Math.PI);
    exportCtx.stroke();
    
    // Groove 2: width: 170px; height: 170px; top: 40px; left: 40px;
    const groove2Radius = vinylRadius * 0.68;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, groove2Radius, 0, 2 * Math.PI);
    exportCtx.stroke();
    
    // Groove 3: width: 140px; height: 140px; top: 55px; left: 55px;
    const groove3Radius = vinylRadius * 0.56;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, groove3Radius, 0, 2 * Math.PI);
    exportCtx.stroke();
    
    if (exportAudio && exportAudio.readyState >= 2 && !exportAudio.paused) {
        exportCtx.restore();
    }


    // Vinyl center with CSS styling (like CSS .vinyl-center)
    const centerRadius = vinylRadius * 0.48; // 120px for 250px vinyl (like CSS width: 120px)
    
    // Vinyl center background (exact match with CSS)
    // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
    const centerGradient = exportCtx.createLinearGradient(centerX - centerRadius, centerY - centerRadius, centerX + centerRadius, centerY + centerRadius);
    centerGradient.addColorStop(0, '#667eea'); // 0%
    centerGradient.addColorStop(1, '#764ba2'); // 100%
    
    // Vinyl center - removed shadow effects
    
    exportCtx.fillStyle = centerGradient;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Add glassmorphism highlight to center
    const centerHighlight = exportCtx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, 0, centerX - centerRadius * 0.3, centerY - centerRadius * 0.3, centerRadius * 0.8);
    centerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    centerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    centerHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    exportCtx.fillStyle = centerHighlight;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Album art with realistic styling (like CSS .album-art)
    const albumArtRadius = centerRadius * 0.83; // 100px for 120px center (like CSS width: 100px)
    if (albumArtImage) {
        // Album art - removed shadow effects
        
        exportCtx.save();
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        exportCtx.clip();
        
        // Draw album art with slight rotation for dynamic effect
        exportCtx.save();
        exportCtx.translate(centerX, centerY);
        exportCtx.rotate((vinylRotation * 0.1 * Math.PI) / 180); // Slow rotation
        exportCtx.translate(-centerX, -centerY);
        exportCtx.drawImage(albumArtImage, centerX - albumArtRadius, centerY - albumArtRadius, 
                          albumArtRadius * 2, albumArtRadius * 2);
        exportCtx.restore();
        
        exportCtx.restore();
        
        // Album art border with gradient
        const borderGradient = exportCtx.createRadialGradient(centerX, centerY, albumArtRadius - 2, centerX, centerY, albumArtRadius);
        borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        exportCtx.strokeStyle = borderGradient;
        exportCtx.lineWidth = 3;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        exportCtx.stroke();
    } else {
        // Default album art placeholder with realistic gradient (like CSS background)
        const albumGradient = exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, albumArtRadius);
        albumGradient.addColorStop(0, '#ff6b6b');
        albumGradient.addColorStop(0.5, '#4ecdc4');
        albumGradient.addColorStop(1, '#667eea');
        exportCtx.fillStyle = albumGradient;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        exportCtx.fill();
        
        // Add subtle border
        exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        exportCtx.lineWidth = 2;
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, albumArtRadius, 0, 2 * Math.PI);
        exportCtx.stroke();
        
        // Add music note icon - removed shadow effects
        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = `${albumArtRadius * 0.4}px Arial`;
        exportCtx.textAlign = 'center';
        exportCtx.fillText('🎵', centerX, centerY + albumArtRadius * 0.15);
    }

    // Draw tonearm after album art (exact match with CSS .tonearm)
    // position: absolute; top: 20px; right: 20px; width: 3px; height: 120px;
    // background: linear-gradient(to bottom, #fff, #ccc); transform: rotate(25deg);
    // Calculate tonearm position to match CSS: top: 20px; right: 20px from vinyl container
    const tonearmX = vinylContainerX + vinylContainerWidth - 20; // right: 20px from container
    const tonearmY = vinylContainerY + 20; // top: 20px from container
    const tonearmLength = 120; // height: 120px as per CSS
    
    exportCtx.save();
    exportCtx.translate(tonearmX, tonearmY);
    exportCtx.rotate(25 * Math.PI / 180); // 25 degrees like CSS
    
    // Draw tonearm as one seamless piece
    // First, draw the main tonearm body with gradient
    const tonearmGradient = exportCtx.createLinearGradient(0, 0, 0, tonearmLength);
    tonearmGradient.addColorStop(0, '#fff');
    tonearmGradient.addColorStop(1, '#ccc');
    
    exportCtx.fillStyle = tonearmGradient;
    exportCtx.fillRect(-1.5, 0, 3, tonearmLength);
    
    // Draw pivot as part of tonearm body (seamless connection)
    exportCtx.fillStyle = '#fff';
    exportCtx.beginPath();
    exportCtx.arc(-1.5, 0, 5, 0, 2 * Math.PI); // Connected to tonearm body
    exportCtx.fill();
    
    // Draw needle as part of tonearm body (seamless connection)
    exportCtx.fillStyle = '#666';
    exportCtx.fillRect(-2, tonearmLength - 5, 6, 10); // Connected to tonearm body
    
    exportCtx.restore();

    // Create song info (exact match with CSS .song-info)
    // text-align: center; color: white;
    const songInfoX = vinylSectionX;
    const songInfoY = vinylContainerY + vinylContainerHeight + 5; // Much closer to vinyl
    const songInfoWidth = vinylSectionWidth;
    const songInfoHeight = 100;
    
    // Get song info from DOM
    const songTitle = document.querySelector('.vinyl-song-title').textContent;
    const artistName = document.querySelector('.vinyl-artist-name').textContent;
    const lyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

    // Song title (exact match with CSS .vinyl-song-title)
    // font-size: 24px; font-weight: bold; margin-top: 16px; letter-spacing: 2px;
    exportCtx.fillStyle = '#ffffff';
    exportCtx.font = `bold 24px 'Patrick Hand', Arial, sans-serif`;
    exportCtx.textAlign = 'center';
    exportCtx.fillText(songTitle, songInfoX + songInfoWidth / 2, songInfoY + 40);

    if (artistName) {
        // Artist name (exact match with CSS .vinyl-artist-name)
        // font-size: 16px; color: rgba(255, 255, 255, 0.9); font-weight: 400; letter-spacing: 1px;
        exportCtx.font = `16px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        exportCtx.fillText(artistName, songInfoX + songInfoWidth / 2, songInfoY + 65);
    }

    // Display current lyrics based on audio time (exact match with CSS .vinyl-lyrics-text)
    // font-size: 18px; color: #ffd700; text-align: center; margin-top: 10px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    if (exportAudio && exportLyrics.length > 0) {
        const currentTime = exportAudio.currentTime;
        const currentLyric = exportLyrics.find(lyric => 
            currentTime >= lyric.start && currentTime <= lyric.end
        );
        
        if (currentLyric) {
            exportCtx.font = `18px 'Patrick Hand', Arial, sans-serif`;
            exportCtx.fillStyle = '#ffd700';
            exportCtx.fillText(currentLyric.text, songInfoX + songInfoWidth / 2, songInfoY + 90);
        }
    } else if (lyricsText) {
        exportCtx.font = `18px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.fillStyle = '#ffd700';
        exportCtx.fillText(lyricsText, songInfoX + songInfoWidth / 2, songInfoY + 90);
    }

    // Create progress container (exact match with CSS .progress-container)
    // width: 100%; padding: 0 30px;
    const progressContainerWidth = musicPlayerWidth;
    const progressContainerHeight = 50;
    const progressContainerX = musicPlayerX;
    const progressContainerY = musicPlayerY + musicPlayerHeight - 180; // More space from bottom
    
    // Draw progress bar (exact match with CSS .vinyl-progress-bar)
    // width: 100%; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px;
    const progressBarWidth = progressContainerWidth - 60; // padding: 0 30px
    const progressBarHeight = 4; // Original height
    const progressBarX = progressContainerX + 30; // padding-left: 30px
    const progressBarY = progressContainerY + 10;
    
    // Progress bar background with better border-radius
    // background: rgba(255, 255, 255, 0.2); border-radius: 2px;
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    exportCtx.save();
    exportCtx.beginPath();
    const bgRadius = 2; // Original border-radius matching height
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
    
    // Progress bar fill (exact match with CSS .progress)
    // background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px;
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
    const fillRadius = 2; // Original border-radius to match background
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
    
    // Scrubber thumb (CSS doesn't show thumb, but we'll add a subtle one)
    const thumbX = progressBarX + progressWidth;
    const thumbY = progressBarY + progressBarHeight / 2;
    const thumbRadius = 4; // Smaller thumb
    
    // Thumb body (no shadow, subtle)
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    exportCtx.beginPath();
    exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Time labels (exact match with CSS .progress-time)
    // display: flex; justify-content: space-between; color: rgba(255, 255, 255, 0.7); font-size: 12px; margin-top: 8px;
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    exportCtx.font = `12px 'Patrick Hand', Arial, sans-serif`;
    exportCtx.textAlign = 'left';
    
    // Format time helper function
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Current time (dynamic if audio is available)
    const currentTime = exportAudio && !isNaN(exportAudio.currentTime) ? exportAudio.currentTime : 0;
    const totalTime = exportAudio && !isNaN(exportAudio.duration) ? exportAudio.duration : 0;
    
    exportCtx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
    
    exportCtx.textAlign = 'right';
    exportCtx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);
    
    // Create controls (exact match with CSS .controls)
    // display: flex; justify-content: space-around; align-items: center; padding: 10px 30px 30px;
    const controlsWidth = musicPlayerWidth;
    const controlsHeight = 80;
    const controlsX = musicPlayerX;
    const controlsY = musicPlayerY + musicPlayerHeight - 140; // Much closer to progress bar, more space from bottom
    
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
    const playIcon = (exportAudio && !exportAudio.paused) ? '⏸' : '▶';
    const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];
    
    // Control buttons (exact match with CSS .control-btn)
    let currentX = startButtonX;
    
    for (let i = 0; i < 5; i++) {
        // Special styling for play button (exact match with CSS .vinyl-play-pause-btn)
        if (i === 2) { // Play button is at index 2
            // width: 70px !important; height: 70px !important; font-size: 28px !important; background: rgba(255, 255, 255, 0.15) !important;
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
            
            // Move to next position
            currentX += playButtonSize + buttonSpacing;
        } else {
            // Regular button styling - center them with the play button
            // background: rgba(255, 255, 255, 0.1)
            const buttonX = currentX + buttonSize/2;
            const buttonYCenter = buttonY + playButtonSize/2; // Align with play button center
            
            exportCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            exportCtx.beginPath();
            exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
            exportCtx.fill();
            
            exportCtx.fillStyle = '#ffffff';
            exportCtx.font = `${buttonSize * 0.4}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';
            exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
            
            // Move to next position
            currentX += buttonSize + buttonSpacing;
        }
    }
}
