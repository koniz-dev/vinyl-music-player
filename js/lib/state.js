export const state = {
    isPlaying: false,
    currentTime: 0,
    totalTime: 0,
    isRepeat: false,
    isExporting: false,
    audioElement: null,
    lyrics: [],
    lyricsColor: '#ffb3d1',
    aspectRatio: '9:16',
    videoFormat: 'webm',
};

export const DEFAULT_LYRICS_COLOR = '#ffb3d1';

/* Canvas dimensions per ratio — native upload resolutions for each platform,
 * so TikTok/IG/YouTube don't have to upscale (which softens the result). */
export const RATIOS = Object.freeze({
    '9:16': { w: 1080, h: 1920, label: 'Vertical · TikTok / Reels / Shorts' },
    '4:5':  { w: 1080, h: 1350, label: 'Portrait · Instagram feed' },
    '1:1':  { w: 1080, h: 1080, label: 'Square · Instagram feed' },
    '16:9': { w: 1920, h: 1080, label: 'Horizontal · YouTube' },
});

export const DEFAULT_ASPECT_RATIO = '9:16';

/* Export container formats — codec candidates tried in order against
 * MediaRecorder.isTypeSupported. MP4 needs native H.264/AAC muxing
 * (Chrome 126+, Safari); WebM works everywhere MediaRecorder does. */
export const FORMATS = Object.freeze({
    mp4: {
        ext: '.mp4',
        label: 'Plays everywhere · phones / messengers',
        candidates: [
            'video/mp4;codecs=avc1.640028,mp4a.40.2',
            'video/mp4;codecs=avc1,mp4a.40.2',
            'video/mp4',
        ],
    },
    webm: {
        ext: '.webm',
        label: 'Smaller files · all desktop browsers',
        candidates: [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
        ],
    },
});

export const DEFAULT_VIDEO_FORMAT = 'webm';
