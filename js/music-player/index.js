/**
 * Music Player Index
 * Main entry point that loads all music player modules using ES6 imports
 */

// Import all music player modules
import { AudioManager } from './audio-manager.js';
import { LyricsManager } from './lyrics-manager.js';
import { AnimationManager } from './animation-manager.js';
import { DisplayManager } from './display-manager.js';
import { ControlsManager } from './controls-manager.js';
import { ProgressManager } from './progress-manager.js';
import { MessageManager } from './message-manager.js';

/**
 * Initialize all music player modules when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules
    const audioManager = new AudioManager();
    const lyricsManager = new LyricsManager();
    const animationManager = new AnimationManager();
    const displayManager = new DisplayManager();
    const controlsManager = new ControlsManager();
    const progressManager = new ProgressManager();
    const messageManager = new MessageManager();
    
    // Setup audio manager callbacks
    audioManager.setupAudio = (audioUrl, callbacks) => {
        audioManager.audioElement = new Audio(audioUrl);
        
        // Setup audio event listeners
        audioManager.audioElement.addEventListener('loadedmetadata', () => {
            audioManager.totalTime = Math.floor(audioManager.audioElement.duration);
            if (callbacks.onLoadedMetadata) {
                callbacks.onLoadedMetadata(audioManager.totalTime);
            }
        });
        
        audioManager.audioElement.addEventListener('timeupdate', () => {
            audioManager.currentTime = audioManager.audioElement.currentTime;
            if (callbacks.onTimeUpdate) {
                callbacks.onTimeUpdate(audioManager.currentTime);
            }
        });
        
        audioManager.audioElement.addEventListener('ended', () => {
            if (audioManager.isRepeat) {
                audioManager.audioElement.currentTime = 0;
                audioManager.audioElement.play();
            } else {
                audioManager.isPlaying = false;
                if (callbacks.onEnded) {
                    callbacks.onEnded();
                }
            }
        });
    };
    
    // Setup controls manager callbacks
    controlsManager.setCallbacks({
        onPlayPauseClick: async () => {
            await audioManager.togglePlayPause();
            controlsManager.updatePlayPauseButton(audioManager.isPlaying);
            animationManager.updatePlayerState(audioManager.isPlaying);
        },
        onMuteClick: () => {
            audioManager.toggleMute();
            controlsManager.updateMuteButton(audioManager.isMuted);
        },
        onRepeatClick: () => {
            audioManager.toggleRepeat();
            controlsManager.updateRepeatButton(audioManager.isRepeat);
        }
    });
    
    // Setup progress manager callbacks
    progressManager.setProgressClickCallback((percent) => {
        const newTime = Math.floor(percent * audioManager.totalTime);
        audioManager.setCurrentTime(newTime);
        progressManager.updateProgress(audioManager.currentTime, audioManager.totalTime);
    });
    
    // Setup message manager callbacks
    messageManager.setCallbacks({
        onStartPlay: (data) => {
            const { audioUrl, songTitle, artistName, albumArtUrl } = data;
            
            // Update song information
            if (songTitle !== undefined) {
                displayManager.updateSongTitle(songTitle);
            }
            if (artistName !== undefined) {
                displayManager.updateArtistName(artistName);
            }
            
            if (albumArtUrl) {
                displayManager.updateAlbumArt(albumArtUrl);
            }
            
            controlsManager.enableControls();
            
            // Setup audio with callbacks
            audioManager.setupAudio(audioUrl, {
                onLoadedMetadata: (totalTime) => {
                    progressManager.updateTotalTime(totalTime);
                },
                onTimeUpdate: (currentTime) => {
                    progressManager.updateProgress(currentTime, audioManager.totalTime);
                    lyricsManager.updateLyrics(currentTime, audioManager.isPlaying);
                },
                onEnded: () => {
                    animationManager.updatePlayerState(audioManager.isPlaying);
                    animationManager.updateTonearm(audioManager.isPlaying);
                    controlsManager.updatePlayPauseButton(audioManager.isPlaying);
                    audioManager.currentTime = 0;
                    progressManager.updateProgress(0, audioManager.totalTime);
                }
            });
            
            // Start playback
            audioManager.play().then(() => {
                animationManager.updatePlayerState(audioManager.isPlaying);
                controlsManager.updatePlayPauseButton(audioManager.isPlaying);
            });
            
            lyricsManager.updateLyrics(audioManager.currentTime, audioManager.isPlaying);
        },
        onUpdateSongTitle: (title) => {
            displayManager.updateSongTitle(title);
        },
        onUpdateArtistName: (artist) => {
            displayManager.updateArtistName(artist);
        },
        onUpdateAlbumArt: (imageUrl) => {
            displayManager.updateAlbumArt(imageUrl);
        },
        onRemoveAlbumArt: () => {
            displayManager.removeAlbumArt();
        },
        onUpdateLyrics: (lyrics) => {
            lyricsManager.updateLyricsFromSettings(lyrics);
            if (audioManager.audioElement) {
                if (audioManager.isPlaying) {
                    lyricsManager.updateLyrics(audioManager.currentTime, audioManager.isPlaying);
                } else {
                    lyricsManager.clearLyrics();
                }
            } else {
                lyricsManager.clearLyrics();
            }
        },
        onUpdateLyricsColor: (color) => {
            lyricsManager.updateLyricsColor(color);
        },
        onDebugBrowserSupport: () => {
            messageManager.debugBrowserSupport();
        },
        onExportRequest: (data) => {
            messageManager.handleExportRequest(data);
        }
    });
    
    // Make managers globally available for debugging
    window.musicPlayer = {
        audioManager,
        lyricsManager,
        animationManager,
        displayManager,
        controlsManager,
        progressManager,
        messageManager
    };
});
