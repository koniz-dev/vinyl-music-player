function cssUrl(imageUrl) {
    const safe = String(imageUrl).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `url("${safe}")`;
}

export function updateAlbumArt(imageUrl) {
    if (!imageUrl) return;
    const albumArt = document.querySelector('.vinyl-album-art');
    if (!albumArt) return;
    albumArt.style.backgroundImage = cssUrl(imageUrl);
    albumArt.dataset.hasArt = 'true';
}
