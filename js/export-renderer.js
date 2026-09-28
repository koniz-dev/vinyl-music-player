import { getFontEmbedCss } from './font-manager.js';
import { captureDomToCanvas, captureSvgToCanvas, maskCanvasToCircle } from './export-capture.js';

const BASE_REFRESH_MS = 1000;
const VINYL_SPIN_PERIOD_S = 8;

export function createExportRenderer({ dimensions, visualizerEnabled }) {
    const { w: width, h: height } = dimensions;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    let frame = document.querySelector('.frame');
    let cachedBase = null;
    let cachedVinyl = null;
    let cachedSheen = null;
    let cachedTonearm = null;
    let vinylRect = null;
    let sheenRect = null;
    let tonearmRect = null;
    let lyricsRect = null;
    let lyricsStyle = null;
    let canvasScale = 1;
    let baseCapturePending = false;
    let lastBaseCapturedAt = 0;
    let fontCss = null;
    let analyser = null;
    let spectrum = null;
    let resizeHandler = null;

    function hasTimedWords(lyrics) {
        return lyrics.some(line => Array.isArray(line.words) && line.words.length);
    }

    function computeLayerRects() {
        const wrap = document.querySelector('.vinyl-wrap');
        if (!frame || !wrap) return;
        const frameRect = frame.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        if (frameRect.width <= 0) return;
        canvasScale = width / frameRect.width;
        const x = (wrapRect.left - frameRect.left) * canvasScale;
        const y = (wrapRect.top - frameRect.top) * canvasScale;
        const wrapWidth = wrapRect.width * canvasScale;
        const wrapHeight = wrapRect.height * canvasScale;
        vinylRect = { x, y, width: wrapWidth, height: wrapHeight };
        sheenRect = { x, y, width: wrapWidth, height: wrapHeight };
        tonearmRect = {
            x: x + wrapWidth * 0.86,
            y: y - wrapHeight * 0.10,
            width: wrapWidth * 0.22,
            height: wrapHeight * 0.75,
        };
        const lyrics = document.querySelector('.vinyl-lyrics-text');
        const lyricsDomRect = lyrics?.getBoundingClientRect();
        if (!lyricsDomRect) return;
        lyricsRect = {
            x: (lyricsDomRect.left - frameRect.left) * canvasScale,
            y: (lyricsDomRect.top - frameRect.top) * canvasScale,
            width: lyricsDomRect.width * canvasScale,
        };
        const style = getComputedStyle(lyrics);
        lyricsStyle = {
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontSize: Math.max(1, parseFloat(style.fontSize) * canvasScale),
            color: style.color,
        };
    }

    function drawKaraokeLyrics(time, lyrics) {
        if (!lyricsRect || !lyricsStyle || !hasTimedWords(lyrics)) return;
        const line = lyrics.find(item => time >= item.start && time < item.end);
        if (!line) return;
        context.save();
        context.font = `${lyricsStyle.fontWeight} ${lyricsStyle.fontSize}px ${lyricsStyle.fontFamily}`;
        context.textBaseline = 'top';
        context.shadowBlur = 2 * canvasScale;
        const drawTranslation = () => {
            if (!line.translation) return;
            context.font = `${lyricsStyle.fontWeight} ${lyricsStyle.fontSize * 0.82}px ${lyricsStyle.fontFamily}`;
            context.fillStyle = 'rgba(255, 255, 255, 0.68)';
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            const translationWidth = context.measureText(line.translation).width;
            context.fillText(line.translation, lyricsRect.x + Math.max(0, (lyricsRect.width - translationWidth) / 2), lyricsRect.y + lyricsStyle.fontSize * 1.42);
        };
        const words = line.words || [];
        const widths = words.map(word => context.measureText(word.text).width);
        const space = context.measureText(' ').width;
        const totalWidth = words.length
            ? widths.reduce((sum, item) => sum + item, 0) + space * (words.length - 1)
            : context.measureText(line.text).width;
        let x = lyricsRect.x + Math.max(0, (lyricsRect.width - totalWidth) / 2);
        if (!words.length) {
            context.fillStyle = lyricsStyle.color;
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.fillText(line.text, x, lyricsRect.y);
        } else {
            words.forEach((word, index) => {
                const active = time >= word.start && time < word.end;
                context.fillStyle = active ? lyricsStyle.color : 'rgba(255, 255, 255, 0.52)';
                context.shadowColor = active
                    ? getComputedStyle(document.documentElement).getPropertyValue('--accent-glow').trim() || 'rgba(129, 140, 248, 0.35)'
                    : 'rgba(0, 0, 0, 0.5)';
                context.fillText(word.text, x, lyricsRect.y);
                x += widths[index] + space;
            });
        }
        drawTranslation();
        context.restore();
    }

    async function refreshBase(lyrics) {
        if (baseCapturePending) return;
        baseCapturePending = true;
        try {
            cachedBase = await captureDomToCanvas(frame, {
                pixelRatio: Math.max(1, canvasScale),
                fontEmbedCSS: fontCss || undefined,
                filter: (node) => {
                    if (!node) return true;
                    if (node.id === 'vinyl' || node.id === 'tonearm') return false;
                    if (node.classList?.contains('vinyl-sheen')) return false;
                    return !(hasTimedWords(lyrics) && node.classList?.contains('vinyl-lyrics-text'));
                },
            });
            lastBaseCapturedAt = performance.now();
        } catch {} finally {
            baseCapturePending = false;
        }
    }

    async function setup(lyrics) {
        const vinyl = document.getElementById('vinyl');
        const tonearm = document.getElementById('tonearm');
        const sheen = document.querySelector('.vinyl-sheen');
        fontCss = await getFontEmbedCss();
        computeLayerRects();
        resizeHandler = computeLayerRects;
        window.addEventListener('resize', resizeHandler);
        const sampleRatio = Math.max(2, canvasScale);
        cachedVinyl = maskCanvasToCircle(await captureDomToCanvas(vinyl, {
            pixelRatio: sampleRatio,
            style: { animation: 'none', transform: 'rotate(0deg)' },
        }));
        cachedSheen = maskCanvasToCircle(await captureDomToCanvas(sheen, { pixelRatio: sampleRatio }));
        cachedTonearm = await captureSvgToCanvas(tonearm, sampleRatio);
        await refreshBase(lyrics);
    }

    function drawFrame(audio, lyrics) {
        if (!cachedBase) return;
        context.clearRect(0, 0, width, height);
        context.drawImage(cachedBase, 0, 0, width, height);
        drawKaraokeLyrics(audio?.currentTime || 0, lyrics);
        if (vinylRect) {
            const cx = vinylRect.x + vinylRect.width / 2;
            const cy = vinylRect.y + vinylRect.height / 2;
            context.save();
            context.shadowColor = 'rgba(0, 0, 0, 0.6)';
            context.shadowBlur = 80 * canvasScale;
            context.shadowOffsetY = 24 * canvasScale;
            context.fillStyle = '#000';
            context.beginPath();
            context.arc(cx, cy, vinylRect.width * 0.48, 0, 2 * Math.PI);
            context.fill();
            context.restore();
        }
        if (cachedVinyl && vinylRect && audio) {
            const cx = vinylRect.x + vinylRect.width / 2;
            const cy = vinylRect.y + vinylRect.height / 2;
            context.save();
            context.translate(cx, cy);
            context.rotate((audio.currentTime / VINYL_SPIN_PERIOD_S) * 2 * Math.PI);
            context.drawImage(cachedVinyl, -vinylRect.width / 2, -vinylRect.height / 2, vinylRect.width, vinylRect.height);
            context.restore();
        }
        if (visualizerEnabled && analyser && spectrum && vinylRect) {
            analyser.getByteFrequencyData(spectrum);
            const cx = vinylRect.x + vinylRect.width / 2;
            const cy = vinylRect.y + vinylRect.height / 2;
            const base = vinylRect.width * 0.53;
            context.save();
            context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#818cf8';
            context.lineWidth = Math.max(2, canvasScale * 2);
            for (let i = 0; i < spectrum.length; i++) {
                const angle = (i / spectrum.length) * Math.PI * 2 - Math.PI / 2;
                const length = (spectrum[i] / 255) * vinylRect.width * 0.08;
                context.globalAlpha = 0.25 + (spectrum[i] / 255) * 0.65;
                context.beginPath();
                context.moveTo(cx + Math.cos(angle) * base, cy + Math.sin(angle) * base);
                context.lineTo(cx + Math.cos(angle) * (base + length), cy + Math.sin(angle) * (base + length));
                context.stroke();
            }
            context.restore();
        }
        if (cachedSheen && sheenRect) context.drawImage(cachedSheen, sheenRect.x, sheenRect.y, sheenRect.width, sheenRect.height);
        if (cachedTonearm && tonearmRect) {
            const pivotX = tonearmRect.x + tonearmRect.width * 0.5;
            const pivotY = tonearmRect.y + tonearmRect.height * 0.10;
            context.save();
            context.translate(pivotX, pivotY);
            context.rotate(16 * Math.PI / 180);
            context.translate(-pivotX, -pivotY);
            context.drawImage(cachedTonearm, tonearmRect.x, tonearmRect.y, tonearmRect.width, tonearmRect.height);
            context.restore();
        }
    }

    return {
        canvas,
        width,
        height,
        setAnalyser(node) {
            analyser = node;
            spectrum = node ? new Uint8Array(node.frequencyBinCount) : null;
        },
        setup,
        drawFrame,
        refreshIfDue(lyrics) {
            if (!baseCapturePending && performance.now() - lastBaseCapturedAt >= BASE_REFRESH_MS) refreshBase(lyrics);
        },
        destroy() {
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
            frame = null;
            cachedBase = cachedVinyl = cachedSheen = cachedTonearm = null;
            analyser = spectrum = null;
        },
    };
}
