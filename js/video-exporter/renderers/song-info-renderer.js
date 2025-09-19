/**
 * Song Info Renderer
 * Handles song title, artist, and lyrics rendering
 */
export class SongInfoRenderer {
    /**
     * Render song information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} vinylLayout - Vinyl layout information
     * @param {Object} layout - Main layout information
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Array} lyrics - Lyrics array
     * @param {string} lyricsColor - Lyrics color
     */
    render(ctx, vinylLayout, layout, audio, lyrics, lyricsColor) {
        const { vinylContainerX, vinylContainerY, vinylContainerHeight } = vinylLayout;
        const { musicPlayerX, musicPlayerWidth } = layout;

        // Create song info (exact match with CSS .song-info)
        // text-align: center; color: white;
        const songInfoX = musicPlayerX;
        const songInfoY = vinylContainerY + vinylContainerHeight + 40; // Lower lyrics position
        const songInfoWidth = musicPlayerWidth;
        const songInfoHeight = 100;
        
        // Get song info from DOM
        const songTitle = document.querySelector('.vinyl-song-title').textContent;
        const artistName = document.querySelector('.vinyl-artist-name').textContent;
        const lyricsText = document.querySelector('.vinyl-lyrics-text').textContent;

        // Song title (exact match with CSS .vinyl-song-title)
        // font-size: 24px; font-weight: bold; margin-top: 16px; letter-spacing: 2px;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 28px 'Patrick Hand', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(songTitle, songInfoX + songInfoWidth / 2, songInfoY);

        if (artistName) {
            // Artist name (exact match with CSS .vinyl-artist-name)
            // font-size: 16px; color: rgba(255, 255, 255, 0.9); font-weight: 400; letter-spacing: 1px;
            ctx.font = `16px 'Patrick Hand', Arial, sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(artistName, songInfoX + songInfoWidth / 2, songInfoY + 25);
        }

        // Display current lyrics based on audio time (exact match with CSS .vinyl-lyrics-text)
        // font-size: 18px; color: #ffd700; text-align: center; margin-top: 10px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        if (audio && lyrics && lyrics.length > 0) {
            const currentTime = audio.currentTime;
            const currentLyric = lyrics.find(lyric => 
                currentTime >= lyric.start && currentTime <= lyric.end
            );
            
            if (currentLyric) {
                ctx.font = `20px 'Patrick Hand', Arial, sans-serif`;
                ctx.fillStyle = lyricsColor;
                ctx.fillText(currentLyric.text, songInfoX + songInfoWidth / 2, songInfoY + 60);
            }
        } else if (lyricsText) {
            ctx.font = `20px 'Patrick Hand', Arial, sans-serif`;
            ctx.fillStyle = lyricsColor;
            ctx.fillText(lyricsText, songInfoX + songInfoWidth / 2, songInfoY + 60);
        }

        return {
            songInfoY,
            songInfoHeight
        };
    }
}
