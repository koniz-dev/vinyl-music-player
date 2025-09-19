/**
 * Message Manager
 * Handles communication with the control panel
 */
export class MessageManager {
    constructor() {
        this.setupMessageHandler();
    }

    /**
     * Setup message handler
     */
    setupMessageHandler() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            const { type } = message;
            
            switch (type) {
                case 'START_PLAY':
                    if (this.onStartPlay) {
                        this.onStartPlay(message);
                    }
                    break;
                case 'UPDATE_SONG_TITLE':
                    if (this.onUpdateSongTitle) {
                        this.onUpdateSongTitle(message.songTitle);
                    }
                    break;
                case 'UPDATE_ARTIST_NAME':
                    if (this.onUpdateArtistName) {
                        this.onUpdateArtistName(message.artistName);
                    }
                    break;
                case 'UPDATE_ALBUM_ART':
                    if (this.onUpdateAlbumArt) {
                        this.onUpdateAlbumArt(message.imageUrl);
                    }
                    break;
                case 'REMOVE_ALBUM_ART':
                    if (this.onRemoveAlbumArt) {
                        this.onRemoveAlbumArt();
                    }
                    break;
                case 'UPDATE_LYRICS':
                    if (this.onUpdateLyrics) {
                        this.onUpdateLyrics(message.lyrics);
                    }
                    break;
                case 'UPDATE_LYRICS_COLOR':
                    if (this.onUpdateLyricsColor) {
                        this.onUpdateLyricsColor(message.color);
                    }
                    break;
                case 'DEBUG_BROWSER_SUPPORT':
                    if (this.onDebugBrowserSupport) {
                        this.onDebugBrowserSupport();
                    }
                    break;
            }
        });
    }

    /**
     * Set callback functions
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.onStartPlay = callbacks.onStartPlay;
        this.onUpdateSongTitle = callbacks.onUpdateSongTitle;
        this.onUpdateArtistName = callbacks.onUpdateArtistName;
        this.onUpdateAlbumArt = callbacks.onUpdateAlbumArt;
        this.onRemoveAlbumArt = callbacks.onRemoveAlbumArt;
        this.onUpdateLyrics = callbacks.onUpdateLyrics;
        this.onUpdateLyricsColor = callbacks.onUpdateLyricsColor;
        this.onDebugBrowserSupport = callbacks.onDebugBrowserSupport;
    }

    /**
     * Debug browser support
     */
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

}
