function cssUrl(imageUrl) {
    const safe = String(imageUrl).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${safe}")`;
}

export function updateAlbumArt(imageUrl) {
    if (!imageUrl) return;

    const musicPlayer = document.querySelector('.music-player');
    const albumArt = document.querySelector('.vinyl-album-art');
    const bg = cssUrl(imageUrl);

    if (musicPlayer) {
        musicPlayer.classList.add('has-album-art');
        musicPlayer.style.backgroundImage = bg;
    }

    if (albumArt) {
        albumArt.style.backgroundImage = bg;
    }
}

