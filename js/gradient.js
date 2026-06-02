const PRESETS = [
    ['#ff6b6b', '#ffa726', '#ffeb3b'],
    ['#ff9a9e', '#fecfef', '#fecfef'],
    ['#ff9a56', '#ff6b6b', '#c44569'],
    ['#667eea', '#764ba2', '#f093fb'],
    ['#4facfe', '#00f2fe', '#43e97b'],
    ['#a8edea', '#fed6e3', '#d299c2'],
    ['#11998e', '#38ef7d', '#56ab2f'],
    ['#134e5e', '#71b280', '#a8e6cf'],
    ['#2c3e50', '#3498db', '#2ecc71'],
    ['#a8c0ff', '#3f2b96', '#c471f5'],
    ['#8360c3', '#2ebf91', '#f093fb'],
    ['#ffecd2', '#fcb69f', '#ff8a80'],
    ['#ffeaa7', '#fab1a0', '#e17055'],
    ['#fd79a8', '#fdcb6e', '#6c5ce7'],
    ['#74b9ff', '#0984e3', '#6c5ce7'],
    ['#a29bfe', '#6c5ce7', '#fd79a8'],
    ['#00b894', '#00cec9', '#74b9ff'],
    ['#ff006e', '#8338ec', '#3a86ff'],
    ['#06ffa5', '#3d5a80', '#ee6c4d'],
    ['#f72585', '#b5179e', '#7209b7'],
];

const ANGLES = ['45deg', '135deg', '180deg', '225deg', '315deg'];
const RADIAL_POSITIONS = [
    'top left', 'top right', 'center center', 'bottom left', 'bottom right',
];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function withAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function linearStops(colors) {
    const step = 100 / (colors.length - 1);
    return colors.map((c, i) => `${c} ${Math.round(i * step)}%`).join(', ');
}

function radialStops(colors) {
    const step = 100 / (colors.length - 1);
    return colors.map((c, i) => `${withAlpha(c, 0.4)} ${Math.round(i * step)}%`).join(', ');
}

export function applyRandomGradient() {
    const colors = pick(PRESETS);
    const linear1 = `linear-gradient(${pick(ANGLES)}, ${linearStops(colors)})`;
    const linear2 = `linear-gradient(${pick(ANGLES)}, ${linearStops([...colors].reverse())})`;
    const radial = `radial-gradient(circle at ${pick(RADIAL_POSITIONS)}, ${radialStops(colors)})`;
    document.body.style.background = `${linear1}, ${radial}, ${linear2}`;
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundSize = '100% 100%';
}
