const handlers = new Map();

const isString = value => typeof value === 'string';
const isEmpty = value => value === undefined;
const isTimestamp = value => Number.isFinite(value) && value >= 0;
const isFile = value => typeof File !== 'undefined' && value instanceof File;
const isBlob = value => typeof Blob !== 'undefined' && value instanceof Blob;
const isTimedWords = value => value === undefined || (Array.isArray(value) && value.every(word =>
    word && typeof word === 'object'
    && isTimestamp(word.start)
    && isTimestamp(word.end)
    && word.end >= word.start
    && isString(word.text)));
const isLyrics = value => Array.isArray(value) && value.every(line =>
    line && typeof line === 'object'
    && isTimestamp(line.start)
    && isTimestamp(line.end)
    && line.end >= line.start
    && isString(line.text)
    && (line.translation === undefined || isString(line.translation))
    && isTimedWords(line.words));

export const Events = Object.freeze({
    PLAY_FILE: 'play-file',
    STOP_PLAYBACK: 'stop-playback',
    UPDATE_SONG_TITLE: 'update-song-title',
    UPDATE_ARTIST_NAME: 'update-artist-name',
    UPDATE_ALBUM_ART: 'update-album-art',
    CLEAR_ALBUM_ART: 'clear-album-art',
    UPDATE_LYRICS: 'update-lyrics',
    UPDATE_LYRICS_COLOR: 'update-lyrics-color',
    UPDATE_ASPECT_RATIO: 'update-aspect-ratio',
    ACCENT_DERIVED: 'accent-derived',
    ACCENT_OVERRIDE_CLEARED: 'accent-override-cleared',
    EXPORT_REQUESTED: 'export-requested',
    EXPORT_CANCEL: 'export-cancel',
    EXPORT_CANCELLED: 'export-cancelled',
    EXPORT_PROGRESS: 'export-progress',
    EXPORT_COMPLETE: 'export-complete',
    EXPORT_ERROR: 'export-error',
    DEBUG_BROWSER_SUPPORT: 'debug-browser-support',
});

const payloadValidators = Object.freeze({
    [Events.PLAY_FILE]: value => value && isString(value.audioUrl) && isString(value.songTitle) && isString(value.artistName),
    [Events.STOP_PLAYBACK]: isEmpty,
    [Events.UPDATE_SONG_TITLE]: isString,
    [Events.UPDATE_ARTIST_NAME]: isString,
    [Events.UPDATE_ALBUM_ART]: value => value === null || isString(value),
    [Events.CLEAR_ALBUM_ART]: isEmpty,
    [Events.UPDATE_LYRICS]: isLyrics,
    [Events.UPDATE_LYRICS_COLOR]: isString,
    [Events.UPDATE_ASPECT_RATIO]: isString,
    [Events.ACCENT_DERIVED]: isString,
    [Events.ACCENT_OVERRIDE_CLEARED]: isEmpty,
    [Events.EXPORT_REQUESTED]: value => value
        && isFile(value.audioFile)
        && isString(value.songTitle)
        && isString(value.artistName)
        && isTimestamp(value.rangeStart)
        && (value.rangeEnd === null || (isTimestamp(value.rangeEnd) && value.rangeEnd > value.rangeStart))
        && (value.albumArtFile === undefined || isFile(value.albumArtFile)),
    [Events.EXPORT_CANCEL]: isEmpty,
    [Events.EXPORT_CANCELLED]: isEmpty,
    [Events.EXPORT_PROGRESS]: value => value && Number.isFinite(value.progress)
        && value.progress >= 0 && value.progress <= 100 && isString(value.message),
    [Events.EXPORT_COMPLETE]: value => value && isBlob(value.videoBlob) && isString(value.fileName),
    [Events.EXPORT_ERROR]: isString,
    [Events.DEBUG_BROWSER_SUPPORT]: isEmpty,
});

export function on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
    return () => off(event, handler);
}

export function off(event, handler) {
    handlers.get(event)?.delete(handler);
}

export function emit(event, payload) {
    const validate = payloadValidators[event];
    if (!validate) throw new Error(`Unknown event: ${event}`);
    if (!validate(payload)) throw new TypeError(`Invalid payload for event: ${event}`);
    const set = handlers.get(event);
    if (!set) return;
    for (const handler of set) handler(payload);
}
