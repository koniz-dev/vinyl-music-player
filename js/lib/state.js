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
