let mediaRecorder = null;
let recordedChunks = [];
let exportCanvas = null;
let exportCtx = null;
let exportAnimationId = null;
let vinylRotation = 0;
let albumArtImage = null;
let exportAudio = null;
let exportLyrics = [];
let exportLyricsColor = '#ffb3d1';

function createExportCanvas() {
    exportCanvas = document.createElement('canvas');
    
    let canvasWidth = 720;
    let canvasHeight = 1280;
    
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
        }
    }
    
    exportCanvas.width = Math.max(canvasWidth, 400);
    exportCanvas.height = Math.max(canvasHeight, 600);
    
    exportCtx = exportCanvas.getContext('2d');
    
    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';
}

async function startVideoRecording(audioFile, songTitle, artistName, albumArtFile) {
    if (isExporting) {
        return;
    }
    isExporting = true;
    
    let wasMainAudioPlaying = false;
    if (audioElement && !audioElement.paused) {
        wasMainAudioPlaying = true;
        audioElement.pause();
        
        isPlaying = false;
        updatePlayerState();
        stopProgressTimer();
        stopLyricsTimer();
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
            if (wasMainAudioPlaying && audioElement) {
                audioElement.play().then(() => {
                    isPlaying = true;
                    updatePlayerState();
                    startProgressTimer();
                    startLyricsTimer();
                }).catch(error => {
                });
            }
            
            const controls = document.querySelectorAll('.control-btn');
            controls.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            isExporting = false;
            
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
        
        
        createExportCanvas();

        if (albumArtFile) {
            window.postMessage({
                type: 'EXPORT_PROGRESS',
                progress: 15,
                message: 'Loading album art...'
            }, '*');
            
            albumArtImage = new Image();
            albumArtImage.src = URL.createObjectURL(albumArtFile);
            await new Promise((resolve) => {
                albumArtImage.onload = resolve;
            });
        }

        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 15,
            message: 'Loading audio...'
        }, '*');
        
        const audioUrl = URL.createObjectURL(audioFile);
        exportAudio = new Audio(audioUrl);
        
        exportLyrics = [...lyrics];
        
        if (window.lyricsColorManager) {
            exportLyricsColor = window.lyricsColorManager.getCurrentColor();
        }
        
        await new Promise((resolve, reject) => {
            exportAudio.addEventListener('loadedmetadata', resolve);
            exportAudio.addEventListener('error', reject);
            setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
        });

        const canvasStream = exportCanvas.captureStream(30);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(exportAudio);
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
        
        mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: mimeType
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async function() {
            if (exportTimeout) {
                clearTimeout(exportTimeout);
            }
            
            const webmBlob = new Blob(recordedChunks, { type: mimeType });
            
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
            
            if (wasMainAudioPlaying && audioElement) {
                audioElement.play().then(() => {
                    isPlaying = true;
                    updatePlayerState();
                    startProgressTimer();
                    startLyricsTimer();
                }).catch(error => {
                });
            }
            
            const controls = document.querySelectorAll('.control-btn');
            controls.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
            
            isExporting = false;
        };

        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: 20,
            message: 'Starting recording...'
        }, '*');
        
        mediaRecorder.start();
        exportAudio.play();
        function renderLoop() {
            renderToCanvas();
            exportAnimationId = requestAnimationFrame(renderLoop);
        }
        renderLoop();

        const duration = exportAudio.duration;
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
                stopVideoRecording();
            }
        }, 100);

    } catch (error) {
        if (exportTimeout) {
            clearTimeout(exportTimeout);
        }
        
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
        
        if (wasMainAudioPlaying && audioElement) {
            audioElement.play().then(() => {
                isPlaying = true;
                updatePlayerState();
                startProgressTimer();
                startLyricsTimer();
            }).catch(error => {
            });
        }
        
        const controls = document.querySelectorAll('.control-btn');
        controls.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        isExporting = false;
        
        window.postMessage({
            type: 'EXPORT_ERROR',
            error: error.message || 'Unknown error occurred'
        }, '*');
    }
}

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
    
    if (albumArtImage) {
        URL.revokeObjectURL(albumArtImage.src);
        albumArtImage = null;
    }
    
    isExporting = false;
}

function debugBrowserSupport() {
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

function renderToCanvas() {
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
    
    const songTitle = document.querySelector('.vinyl-song-title').textContent;
    const artistName = document.querySelector('.vinyl-artist-name').textContent;
    const lyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

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
    
    const playIcon = (exportAudio && !exportAudio.paused) ? '⏸' : '▶';
    const buttonIcons = ['🔊', '⏮', playIcon, '⏭', '↻'];
    
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

window.addEventListener('message', function(event) {
    if (event.data.type === 'UPDATE_LYRICS_COLOR') {
        exportLyricsColor = event.data.color;
    }
});
