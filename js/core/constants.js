/**
 * Application Constants
 * Centralized configuration values to replace magic numbers
 */
class Constants {
    static ANIMATION = {
        VINYL_ROTATION_SPEED: 0.03, // degrees per millisecond
        VINYL_ROTATION_DURATION: 12000, // 12 seconds per full rotation
        FADE_DURATION: 150, // milliseconds
        TIMEOUT_DELAY: 100, // milliseconds
        FRAME_RATE: 30 // FPS for export
    };

    static EXPORT = {
        MAX_FILE_SIZE_MB: 100, // Maximum audio file size in MB
        MAX_IMAGE_SIZE_MB: 10, // Maximum image file size in MB
        EXPORT_TIMEOUT: 5 * 60 * 1000, // 5 minutes timeout
        PROGRESS_UPDATE_INTERVAL: 100, // milliseconds
        CANVAS_MIN_WIDTH: 400,
        CANVAS_MIN_HEIGHT: 600,
        DEFAULT_CANVAS_WIDTH: 720,
        DEFAULT_CANVAS_HEIGHT: 1280
    };

    static AUDIO = {
        LOADING_TIMEOUT: 10000, // 10 seconds
        SUPPORTED_FORMATS: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/aac',
            'audio/flac',
            'audio/m4a',
            'audio/x-m4a',
            'audio/mp4a-latm'
        ],
        SUPPORTED_EXTENSIONS: ['.mp3', '.wav', '.ogg', '.mp4', '.aac', '.flac', '.m4a']
    };

    static IMAGE = {
        SUPPORTED_FORMATS: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ]
    };

    static UI = {
        TOAST_DURATION: {
            SUCCESS: 4000,
            ERROR: 5000,
            INFO: 4000,
            WARNING: 4500
        },
        MAX_TOASTS: 5,
        DEBOUNCE_DELAY: 300, // milliseconds
        PROGRESS_UPDATE_DELAY: 100 // milliseconds
    };

    static LYRICS = {
        DEFAULT_COLOR: '#8B4513',
        TIME_FORMAT_REGEX: /^[0-9]{1,2}:[0-9]{2}$/,
        MAX_LYRICS_ITEMS: 1000
    };

    static STATE = {
        MAX_HISTORY_SIZE: 50,
        BATCH_UPDATE_DELAY: 16 // ~60fps
    };

    static MEDIA_RECORDER = {
        MIME_TYPES: [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ],
        DEFAULT_MIME_TYPE: 'video/webm'
    };

    static FONTS = {
        PRIMARY: "'Patrick Hand', Arial, sans-serif",
        FONT_AWESOME: 'FontAwesome'
    };

    static COLORS = {
        PRIMARY: '#8B4513',
        SECONDARY: '#c8bda9',
        BACKGROUND_GRADIENT: {
            START: '#667eea',
            MIDDLE: '#f093fb',
            END: '#f5576c'
        },
        VINYL: {
            CENTER_START: '#667eea',
            CENTER_END: '#764ba2'
        }
    };

    static DIMENSIONS = {
        VINYL: {
            RADIUS: 100, // pixels
            CENTER_RADIUS_RATIO: 0.48,
            ALBUM_ART_RADIUS_RATIO: 0.83
        },
        CONTROLS: {
            BUTTON_SIZE: 45,
            PLAY_BUTTON_SIZE: 70,
            TONEARM_LENGTH: 96,
            TONEARM_ANGLE: 25 // degrees
        }
    };

    static ERRORS = {
        AUDIO_LOAD_FAILED: 'Failed to load audio file',
        IMAGE_LOAD_FAILED: 'Failed to load image file',
        EXPORT_TIMEOUT: 'Export timeout. Please try again with a shorter audio file.',
        INVALID_FILE_TYPE: 'Invalid file type',
        FILE_TOO_LARGE: 'File size exceeds maximum limit',
        LYRICS_INVALID_FORMAT: 'Invalid lyrics format',
        BROWSER_NOT_SUPPORTED: 'Your browser does not support this feature'
    };

    static EVENTS = {
        // Audio events
        AUDIO_LOADED: 'audio:loaded',
        AUDIO_PLAY: 'audio:play',
        AUDIO_PAUSE: 'audio:pause',
        AUDIO_STOP: 'audio:stop',
        AUDIO_ERROR: 'audio:error',
        AUDIO_TIME_UPDATE: 'audio:timeUpdate',
        
        // Export events
        EXPORT_START: 'export:start',
        EXPORT_PROGRESS: 'export:progress',
        EXPORT_COMPLETE: 'export:complete',
        EXPORT_ERROR: 'export:error',
        
        // Lyrics events
        LYRICS_LOADED: 'lyrics:loaded',
        LYRICS_CURRENT_CHANGED: 'lyrics:currentChanged',
        LYRICS_COLOR_CHANGED: 'lyrics:colorChanged',
        
        // UI events
        UI_UPDATE_SONG_INFO: 'ui:updateSongInfo',
        
        // App events
        APP_ERROR: 'app:error',
        APP_INITIALIZED: 'app:initialized'
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}

window.Constants = Constants;
