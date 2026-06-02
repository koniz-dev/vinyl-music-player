export const state = {
    isPlaying: false,
    currentTime: 0,
    totalTime: 0,
    isMuted: false,
    isRepeat: false,
    isExporting: false,
    audioElement: null,
    lyrics: [],
    lyricsColor: '#ffb3d1',
    aspectRatio: '9:16',
};

export const DEFAULT_LYRICS_COLOR = '#ffb3d1';

/* Canvas dimensions per ratio — chosen to keep min dimension ~720–1080. */
export const RATIOS = Object.freeze({
    '9:16': { w: 720,  h: 1280, label: 'Vertical · TikTok / Reels / Shorts' },
    '4:5':  { w: 864,  h: 1080, label: 'Portrait · Instagram feed' },
    '1:1':  { w: 1080, h: 1080, label: 'Square · Instagram feed' },
    '16:9': { w: 1280, h: 720,  label: 'Horizontal · YouTube' },
});

export const DEFAULT_ASPECT_RATIO = '9:16';
