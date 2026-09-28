import { toCanvas } from './vendor/html-to-image.js';

export async function captureDomToCanvas(node, extra = {}) {
    return Promise.race([
        toCanvas(node, {
            pixelRatio: 1,
            cacheBust: false,
            skipFonts: true,
            skipAutoScale: true,
            ...extra,
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('capture-timeout')), 2000)
        ),
    ]);
}

// html-to-image cannot reliably rasterize nested SVG in foreignObject. Render
// the SVG as a standalone image instead, preserving its computed shadow.
export async function captureSvgToCanvas(svgEl, scale = 2) {
    const clone = svgEl.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.transition = 'none';

    const computed = getComputedStyle(svgEl);
    if (computed.filter && computed.filter !== 'none') clone.style.filter = computed.filter;

    const rect = svgEl.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svg = new XMLSerializer().serializeToString(clone);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas);
        };
        image.onerror = () => reject(new Error('svg-image-load-failed'));
        image.src = url;
    });
}

export function maskCanvasToCircle(sourceCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, 2 * Math.PI);
    context.clip();
    context.drawImage(sourceCanvas, 0, 0);
    return canvas;
}
