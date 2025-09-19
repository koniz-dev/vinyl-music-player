/**
 * Color Constants
 * Centralized color management for the vinyl music player
 */

export const COLORS = {
    // Default lyrics color - Pastel Pink
    DEFAULT_LYRICS_COLOR: '#FFB6C1',
    
    // Other colors can be added here in the future
    // DEFAULT_BACKGROUND_COLOR: '#000000',
    // DEFAULT_TEXT_COLOR: '#FFFFFF',
};

/**
 * Get the default lyrics color
 * @returns {string} The default lyrics color hex code
 */
export function getDefaultLyricsColor() {
    return COLORS.DEFAULT_LYRICS_COLOR;
}
