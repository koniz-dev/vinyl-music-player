/**
 * Application Constants
 * Centralized configuration values to replace magic numbers
 */
class Constants {
    static ANIMATION = {
        VINYL_ROTATION_SPEED: 0.03, // degrees per millisecond
        FADE_DURATION: 150, // milliseconds
        TIMEOUT_DELAY: 100, // milliseconds
        PROGRESS_UPDATE_INTERVAL: 100, // milliseconds
        FRAME_DEBUG_INTERVAL: 100 // frames
    };

    static EXPORT = {
        MAX_FILE_SIZE_MB: 100, // Maximum audio file size in MB
        MAX_IMAGE_SIZE_MB: 10, // Maximum image file size in MB
        EXPORT_TIMEOUT: 5 * 60 * 1000, // 5 minutes timeout
        CANVAS_MIN_WIDTH: 400,
        CANVAS_MIN_HEIGHT: 600,
        DEFAULT_CANVAS_WIDTH: 720,
        DEFAULT_CANVAS_HEIGHT: 1280,
        PROGRESS_UPDATE_INTERVAL: 100, // milliseconds
        PROCESSING_DELAY: 100 // milliseconds
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
        ]
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


    static PLAYER_BASE_COLOR = '#c8bda9'; // Single source of truth for all player colors
    
    static LYRICS = {
        FADE_DURATION: 150 // milliseconds
    };




    static COLORS = {
        BACKGROUND_GRADIENT: {
            COLORS: [
                '#667eea', // Blue
                '#764ba2', // Purple
                '#f093fb', // Pink
                '#f5576c', // Red-pink
                '#4facfe', // Light blue
                '#00f2fe', // Cyan
                '#43e97b', // Green
                '#38f9d7', // Teal
                '#fa709a', // Rose
                '#fee140', // Yellow
                '#a8edea', // Mint
                '#d299c2', // Lavender
                '#ffecd2', // Peach
                '#fcb69f', // Coral
                '#ff9a9e', // Pink-red
                '#fecfef', // Light pink
                '#a6c1ee', // Periwinkle
                '#fbc2eb', // Light purple
                '#a8caba', // Sage green
                '#ffd3a5'  // Apricot
            ]
        },
        VINYL: {
            CENTER_START: '#667eea',
            CENTER_END: '#764ba2'
        }
    };

    static DIMENSIONS = {
        VINYL: {
            CENTER_RADIUS_RATIO: 0.48,
            ALBUM_ART_RADIUS_RATIO: 0.83
        },
        CONTROLS: {
            TONEARM_LENGTH: 96,
            TONEARM_ANGLE: 25 // degrees
        }
    };

    static ERRORS = {
        INVALID_FILE_TYPE: 'Invalid file type'
    };

    static UI = {
        FOCUS_DELAY: 100, // milliseconds
        TOAST_SHOW_DELAY: 100, // milliseconds
        PROGRESS_MAX: 100, // percentage
        LOGGER_MAX_HISTORY: 100 // entries
    };

    static TIME = {
        RETRY_DELAY: 1000, // milliseconds
        INIT_DELAY: 100 // milliseconds
    };

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}

window.Constants = Constants;
