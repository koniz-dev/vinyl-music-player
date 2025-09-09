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
            const fileName = `${songTitle.replace(/[^a-zA-Z0-9]/g, '_')}_vinyl_video.webm`;
            
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

    // Clear canvas with music player background (like CSS .music-player)
    exportCtx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // CSS background: rgba(0, 0, 0, 0.8)
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Add rounded corners effect (like CSS border-radius: 30px)
    exportCtx.save();
    exportCtx.beginPath();
    // Use manual rounded rect for better browser compatibility
    const radius = 30;
    exportCtx.moveTo(radius, 0);
    exportCtx.lineTo(exportCanvas.width - radius, 0);
    exportCtx.quadraticCurveTo(exportCanvas.width, 0, exportCanvas.width, radius);
    exportCtx.lineTo(exportCanvas.width, exportCanvas.height - radius);
    exportCtx.quadraticCurveTo(exportCanvas.width, exportCanvas.height, exportCanvas.width - radius, exportCanvas.height);
    exportCtx.lineTo(radius, exportCanvas.height);
    exportCtx.quadraticCurveTo(0, exportCanvas.height, 0, exportCanvas.height - radius);
    exportCtx.lineTo(0, radius);
    exportCtx.quadraticCurveTo(0, 0, radius, 0);
    exportCtx.clip();
    
    // Draw blurred album art background if available
    if (albumArtImage) {
        exportCtx.save();
        exportCtx.filter = 'blur(30px) brightness(0.4) saturate(1.2)';
        
        // Calculate proper scaling to cover entire canvas
        const imgAspect = albumArtImage.width / albumArtImage.height;
        const canvasAspect = exportCanvas.width / exportCanvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
            drawHeight = exportCanvas.height + 200;
            drawWidth = drawHeight * imgAspect;
            offsetX = (exportCanvas.width - drawWidth) / 2;
            offsetY = -100;
        } else {
            drawWidth = exportCanvas.width + 200;
            drawHeight = drawWidth / imgAspect;
            offsetX = -100;
            offsetY = (exportCanvas.height - drawHeight) / 2;
        }
        
        exportCtx.drawImage(albumArtImage, offsetX, offsetY, drawWidth, drawHeight);
        exportCtx.restore();
        
        // Add dark overlay
        exportCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }
    
    exportCtx.restore();

    // Draw vinyl record (centered, responsive size) - matching CSS exactly
    const centerX = exportCanvas.width / 2;
    const centerY = exportCanvas.height * 0.4; // Higher up for mobile layout
    const vinylRadius = Math.min(exportCanvas.width, exportCanvas.height) * 0.25; // Responsive size

    // Vinyl background with realistic shadow and styling (like CSS box-shadow: 0 0 50px rgba(0, 0, 0, 0.5))
    exportCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    exportCtx.shadowBlur = 60;
    exportCtx.shadowOffsetX = 0;
    exportCtx.shadowOffsetY = 15;
    
    // Vinyl record with realistic gradient (like CSS radial-gradient(circle at center, #1a1a1a 30%, #000 70%))
    const vinylGradient = exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, vinylRadius);
    vinylGradient.addColorStop(0, '#1a1a1a');
    vinylGradient.addColorStop(0.3, '#1a1a1a');
    vinylGradient.addColorStop(0.7, '#000000');
    vinylGradient.addColorStop(1, '#000000');
    
    exportCtx.fillStyle = vinylGradient;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, vinylRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Draw vinyl grooves (like CSS .vinyl-grooves) - MORE DETAILED
    exportCtx.shadowBlur = 0;
    
    // Multiple detailed grooves
    for (let i = 1; i <= 8; i++) {
        const grooveRadius = vinylRadius * (0.9 - i * 0.08);
        const opacity = 0.15 - (i * 0.015);
        
        exportCtx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        exportCtx.lineWidth = 0.5 + (i * 0.1);
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, grooveRadius, 0, 2 * Math.PI);
        exportCtx.stroke();
    }
    
    // Add radial lines for vinyl effect
    exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    exportCtx.lineWidth = 0.5;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const startRadius = vinylRadius * 0.3;
        const endRadius = vinylRadius * 0.9;
        
        exportCtx.beginPath();
        exportCtx.moveTo(
            centerX + Math.cos(angle) * startRadius,
            centerY + Math.sin(angle) * startRadius
        );
        exportCtx.lineTo(
            centerX + Math.cos(angle) * endRadius,
            centerY + Math.sin(angle) * endRadius
        );
        exportCtx.stroke();
    }

    // Draw tonearm (like CSS .tonearm)
    const tonearmX = centerX + vinylRadius * 0.8;
    const tonearmY = centerY - vinylRadius * 0.8;
    const tonearmLength = vinylRadius * 0.48; // 120px for 250px vinyl
    
    exportCtx.save();
    exportCtx.translate(tonearmX, tonearmY);
    exportCtx.rotate(25 * Math.PI / 180); // 25 degrees like CSS
    
    // Tonearm body (like CSS background: linear-gradient(to bottom, #fff, #ccc))
    const tonearmGradient = exportCtx.createLinearGradient(0, 0, 0, tonearmLength);
    tonearmGradient.addColorStop(0, '#fff');
    tonearmGradient.addColorStop(1, '#ccc');
    
    exportCtx.fillStyle = tonearmGradient;
    exportCtx.fillRect(-1.5, 0, 3, tonearmLength);
    
    // Tonearm pivot (like CSS ::before)
    exportCtx.fillStyle = '#fff';
    exportCtx.beginPath();
    exportCtx.arc(0, -8, 5, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Tonearm needle (like CSS ::after)
    exportCtx.fillStyle = '#666';
    exportCtx.fillRect(-1, tonearmLength - 5, 3, 10);
    
    exportCtx.restore();

    // Vinyl center with CSS styling (like CSS .vinyl-center)
    const centerRadius = vinylRadius * 0.48; // 120px for 250px vinyl (like CSS width: 120px)
    
    // Vinyl center background (like CSS background: linear-gradient(135deg, #667eea 0%, #764ba2 100%))
    const centerGradient = exportCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerRadius);
    centerGradient.addColorStop(0, '#ff6b6b'); // Pink-orange center
    centerGradient.addColorStop(0.3, '#4ecdc4'); // Teal
    centerGradient.addColorStop(0.6, '#667eea'); // Blue
    centerGradient.addColorStop(1, '#764ba2'); // Purple
    
    // Vinyl center shadow (like CSS box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3))
    exportCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    exportCtx.shadowBlur = 20;
    exportCtx.shadowOffsetX = 0;
    exportCtx.shadowOffsetY = 0;
    
    exportCtx.fillStyle = centerGradient;
    exportCtx.beginPath();
    exportCtx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Album art with realistic styling (like CSS .album-art)
    const albumArtRadius = centerRadius * 0.83; // 100px for 120px center (like CSS width: 100px)
    if (albumArtImage) {
        // Album art shadow with realistic depth
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        exportCtx.shadowBlur = 15;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 8;
        
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
        exportCtx.shadowBlur = 0;
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
        
        // Add music note icon with shadow
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        exportCtx.shadowBlur = 5;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 2;
        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = `${albumArtRadius * 0.4}px Arial`;
        exportCtx.textAlign = 'center';
        exportCtx.fillText('🎵', centerX, centerY + albumArtRadius * 0.15);
        exportCtx.shadowBlur = 0;
    }

    // Song info with realistic typography (like real UI)
    const songTitle = document.querySelector('.vinyl-song-title').textContent;
    const artistName = document.querySelector('.vinyl-artist-name').textContent;
    const lyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

    // Song title with realistic styling (like CSS .song-title)
    exportCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    exportCtx.shadowBlur = 20;
    exportCtx.shadowOffsetX = 0;
    exportCtx.shadowOffsetY = 4;
    
    exportCtx.fillStyle = '#ffffff';
    exportCtx.font = `bold ${exportCanvas.width * 0.06}px 'Patrick Hand', Arial, sans-serif`;
    exportCtx.textAlign = 'center';
    exportCtx.fillText(songTitle, centerX, centerY + vinylRadius + 100);

    if (artistName) {
        // Artist name (like CSS .artist-name)
        exportCtx.font = `${exportCanvas.width * 0.04}px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // CSS color: rgba(255, 255, 255, 0.7)
        exportCtx.fillText(artistName, centerX, centerY + vinylRadius + 140);
    }
    
    exportCtx.shadowBlur = 0;

    // Display current lyrics based on audio time (like real UI)
    if (exportAudio && exportLyrics.length > 0) {
        const currentTime = exportAudio.currentTime;
        const currentLyric = exportLyrics.find(lyric => 
            currentTime >= lyric.start && currentTime <= lyric.end
        );
        
        if (currentLyric) {
            exportCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            exportCtx.shadowBlur = 10;
            exportCtx.font = `${exportCanvas.width * 0.035}px 'Patrick Hand', Arial, sans-serif`;
            exportCtx.fillStyle = '#ffd700';
            exportCtx.fillText(currentLyric.text, centerX, centerY + vinylRadius + 180);
            exportCtx.shadowBlur = 0;
        }
    } else if (lyricsText) {
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        exportCtx.shadowBlur = 10;
        exportCtx.font = `${exportCanvas.width * 0.035}px 'Patrick Hand', Arial, sans-serif`;
        exportCtx.fillStyle = '#ffd700';
        exportCtx.fillText(lyricsText, centerX, centerY + vinylRadius + 180);
        exportCtx.shadowBlur = 0;
    }

    // Draw progress bar (like CSS .progress-bar)
    const progressBarY = centerY + vinylRadius + 220;
    const progressBarWidth = exportCanvas.width * 0.8;
    const progressBarHeight = 6; // Increased height for better visibility
    const progressBarX = (exportCanvas.width - progressBarWidth) / 2;
    
    // Progress bar background with rounded corners
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    exportCtx.save();
    exportCtx.beginPath();
    const bgRadius = progressBarHeight / 2;
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
    
    // Progress bar fill (like CSS background: linear-gradient(90deg, #667eea, #764ba2))
    const progressPercent = exportAudio ? (exportAudio.currentTime / exportAudio.duration) : 0.33; // Dynamic progress
    const progressWidth = progressBarWidth * progressPercent;
    const progressGradient = exportCtx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressWidth, progressBarY);
    progressGradient.addColorStop(0, '#667eea');
    progressGradient.addColorStop(1, '#764ba2');
    
    exportCtx.fillStyle = progressGradient;
    exportCtx.save();
    exportCtx.beginPath();
    const fillRadius = progressBarHeight / 2;
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
    
    // Scrubber thumb (like CSS progress thumb)
    const thumbX = progressBarX + progressWidth;
    const thumbY = progressBarY + progressBarHeight / 2;
    const thumbRadius = 8;
    
    // Thumb shadow
    exportCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    exportCtx.shadowBlur = 6;
    exportCtx.shadowOffsetX = 0;
    exportCtx.shadowOffsetY = 2;
    
    // Thumb body
    exportCtx.fillStyle = '#ffffff';
    exportCtx.beginPath();
    exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
    exportCtx.fill();
    
    // Thumb border
    exportCtx.shadowBlur = 0;
    exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    exportCtx.lineWidth = 1;
    exportCtx.beginPath();
    exportCtx.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
    exportCtx.stroke();
    
    // Time labels (like CSS time display) - dynamic based on audio
    exportCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    exportCtx.font = `${exportCanvas.width * 0.03}px 'Patrick Hand', Arial, sans-serif`;
    exportCtx.textAlign = 'left';
    
    // Format time helper function
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Current time (dynamic if audio is available)
    const currentTime = exportAudio ? exportAudio.currentTime : 20;
    const totalTime = exportAudio ? exportAudio.duration : 59;
    
    exportCtx.fillText(formatTime(currentTime), progressBarX, progressBarY + 20);
    
    exportCtx.textAlign = 'right';
    exportCtx.fillText(formatTime(totalTime), progressBarX + progressBarWidth, progressBarY + 20);
    
    // Draw control buttons (like CSS control buttons)
    const buttonY = progressBarY + 50;
    const buttonSize = exportCanvas.width * 0.08;
    const buttonSpacing = exportCanvas.width * 0.12;
    const startButtonX = (exportCanvas.width - (5 * buttonSize + 4 * buttonSpacing)) / 2;
    
    // Control button icons
    const buttonIcons = ['🔊', '⏮', '▶', '⏭', '🔁'];
    
    // Control buttons with enhanced shadows and icons
    for (let i = 0; i < 5; i++) {
        const buttonX = startButtonX + i * (buttonSize + buttonSpacing) + buttonSize/2;
        const buttonYCenter = buttonY + buttonSize/2;
        
        // Button shadow
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        exportCtx.shadowBlur = 8;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 3;
        
        // Button body with better visibility
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        exportCtx.beginPath();
        exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
        exportCtx.fill();
        
        // Button border
        exportCtx.shadowBlur = 0;
        exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        exportCtx.lineWidth = 2;
        exportCtx.beginPath();
        exportCtx.arc(buttonX, buttonYCenter, buttonSize/2, 0, 2 * Math.PI);
        exportCtx.stroke();
        
        // Button icon
        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = `${buttonSize * 0.4}px Arial`;
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';
        exportCtx.fillText(buttonIcons[i], buttonX, buttonYCenter);
    }
    
    // Update vinyl rotation
    vinylRotation += 0.5;
}
