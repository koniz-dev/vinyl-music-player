const handlers = new Map();

export function on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
    return () => off(event, handler);
}

export function off(event, handler) {
    handlers.get(event)?.delete(handler);
}

export function emit(event, payload) {
    const set = handlers.get(event);
    if (!set) return;
    for (const handler of set) handler(payload);
}

export const Events = Object.freeze({
    PLAY_FILE: 'play-file',
    UPDATE_SONG_TITLE: 'update-song-title',
    UPDATE_ARTIST_NAME: 'update-artist-name',
    UPDATE_ALBUM_ART: 'update-album-art',
    UPDATE_LYRICS: 'update-lyrics',
    UPDATE_LYRICS_COLOR: 'update-lyrics-color',
    EXPORT_REQUESTED: 'export-requested',
    EXPORT_PROGRESS: 'export-progress',
    EXPORT_COMPLETE: 'export-complete',
    EXPORT_ERROR: 'export-error',
    DEBUG_BROWSER_SUPPORT: 'debug-browser-support',
});
