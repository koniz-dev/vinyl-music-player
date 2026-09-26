/* Short, task-shaped walkthroughs. A person can learn the one area they need
 * now, then return to the same Help button later for another area. */

const TOURS = {
    basics: [
        { section: 'song', target: '#audio-upload-area', title: 'Add your audio', text: 'Click this area and choose your MP3, WAV, OGG, M4A, or AAC file. This is the only required step.' },
        { section: 'song', target: '#song-title', title: 'Name the song', text: 'Click Song title to replace the name read from the file, or leave it blank.' },
        { section: 'song', target: '#artist-name', title: 'Add the artist', text: 'Click Artist to set the artist name. This is optional.' },
    ],
    artwork: [
        { target: '[data-section-key="artwork"] .section-toggle', title: 'Open Artwork', text: 'Click Artwork to reveal cover options. Then press Next.' },
        { section: 'artwork', target: '#upload-area', title: 'Upload album art', text: 'Click here to choose an image for the record label and background. This is optional.' },
        { section: 'artwork', target: '.cover-generator-panel summary', title: 'Generate a cover (optional)', text: 'Click Generate cover with AI to reveal its prompt. A prompt is sent to Pollinations only after you confirm.' },
    ],
    lyrics: [
        { target: '[data-section-key="lyrics"] .section-toggle', title: 'Open Lyrics', text: 'Click Lyrics to add words to the video. Then press Next.' },
        { section: 'lyrics', target: '.lyrics-toolbar', title: 'Add or import lyrics', text: 'Click Line for a timed line, or Import to paste JSON or LRC lyrics.' },
        { section: 'lyrics', target: '.autosync-panel summary', title: 'Open Auto-sync', text: 'Click Auto-sync with AI to reveal local Whisper timing tools.' },
        { section: 'lyrics', details: '.autosync-panel', target: '#autosync-lyrics-input', title: 'Paste plain lyrics', text: 'Click this box and paste one lyric line per row. Leave it blank to transcribe from scratch.' },
        { section: 'lyrics', details: '.autosync-panel', target: '#whisper-model', title: 'Choose AI quality', text: 'Click AI model: Tiny is ~40 MB and faster; Small is ~250 MB and more accurate. The download starts only when you run it.' },
        { section: 'lyrics', details: '.autosync-panel', target: '#auto-sync-btn', title: 'Time the lyrics', text: 'Click Auto-sync after loading audio. Timing runs locally in your browser.' },
        { section: 'lyrics', target: '.lyrics-tools-panel summary', title: 'Open more lyric tools', text: 'Click More lyric tools for LRC export, lyric lookup, and translation.' },
        { section: 'lyrics', details: '.lyrics-tools-panel', target: '#export-lrc-btn', title: 'Export LRC', text: 'Click Export LRC to save your current timed lyrics as an LRC file.' },
        { section: 'lyrics', details: '.lyrics-tools-panel', target: '#find-lyrics-btn', title: 'Find lyrics online', text: 'Click Find lyrics to search LRCLIB. It asks before sending song metadata; audio never leaves your device.' },
        { section: 'lyrics', details: '.lyrics-tools-panel', target: '#translate-lyrics-btn', title: 'Translate locally', text: 'Choose a direction then click Translate. NLLB is a large local download (over 1 GB), confirmed first and removable here.' },
    ],
    appearance: [
        { target: '[data-section-key="appearance"] .section-toggle', title: 'Open Appearance', text: 'Click Appearance to customize the visual style. Then press Next.' },
        { section: 'appearance', target: '.app-theme-toggle', title: 'Choose the app theme', text: 'Click System to follow your device, or choose Dark or Light for the app interface.' },
        { section: 'appearance', target: '#palette-list', title: 'Pick a palette', text: 'Click a palette for a one-tap color scheme. Auto album art derives colors from your artwork.' },
        { section: 'appearance', target: '#color-list', title: 'Fine-tune colors', text: 'Click any color swatch to override an individual color.' },
        { section: 'appearance', target: '.font-list', title: 'Pick a font', text: 'Click a font option to update song text and lyrics.' },
        { section: 'appearance', target: '.appearance-enhancements summary', title: 'Open Enhancements', text: 'Click Enhancements for the visualizer and audio-based theme suggestion.' },
        { section: 'appearance', details: '.appearance-enhancements', target: '#visualizer-enabled', title: 'Add a visualizer', text: 'Click this checkbox to add an audio-reactive spectrum ring to exported video.' },
        { section: 'appearance', details: '.appearance-enhancements', target: '#suggest-theme-btn', title: 'Suggest a theme', text: 'Click this to analyze the first 30 seconds locally and choose a matching palette and font.' },
    ],
    export: [
        { target: '[data-section-key="export"] .section-toggle', title: 'Open Export', text: 'Click Export to choose the final video format. Then press Next.' },
        { section: 'export', target: '.ratio-toggle', title: 'Choose the aspect ratio', text: 'Click 9:16 for Shorts/Reels, or choose 4:5, 1:1, or 16:9.' },
        { section: 'export', target: '.format-toggle', title: 'Choose the video format', text: 'Click MP4 or WebM. Unsupported choices are disabled automatically for your browser.' },
        { section: 'export', target: '#export-start', title: 'Trim the export (optional)', text: 'Click these fields and enter start/end times as mm:ss, or leave both blank for the whole track.' },
        { section: 'export', target: '#export-btn', title: 'Export', text: 'Click Export when audio is ready. The video is rendered and saved locally on your device.' },
    ],
};

export function initTour() {
    const overlay = document.getElementById('tour-overlay');
    const spotlight = document.getElementById('tour-spotlight');
    const card = overlay?.querySelector('.tour-card');
    const title = document.getElementById('tour-title');
    const description = document.getElementById('tour-description');
    const progress = document.getElementById('tour-progress');
    const next = document.getElementById('tour-next-btn');
    const skip = document.getElementById('tour-skip-btn');
    const starts = document.querySelectorAll('[data-tour-start]');
    if (!overlay || !spotlight || !card || !title || !description || !progress || !next || !skip || !starts.length) return;

    let steps = [];
    let index = 0;
    let target;
    let previousFocus;
    const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    const openSection = (key) => {
        if (!key) return;
        const section = document.querySelector(`.settings-section[data-section-key="${key}"]`);
        if (section?.dataset.collapsed === 'true') section.querySelector('.section-toggle')?.click();
    };

    const position = () => {
        if (!target || overlay.hidden) return;
        const rect = target.getBoundingClientRect();
        const gap = 10;
        spotlight.style.left = `${Math.max(gap, rect.left - gap)}px`;
        spotlight.style.top = `${Math.max(gap, rect.top - gap)}px`;
        spotlight.style.width = `${Math.max(1, rect.width + gap * 2)}px`;
        spotlight.style.height = `${Math.max(1, rect.height + gap * 2)}px`;
        const cardWidth = Math.min(330, innerWidth - 24);
        card.style.width = `${cardWidth}px`;
        const cardHeight = card.offsetHeight;
        const left = Math.min(Math.max(12, rect.left), innerWidth - cardWidth - 12);
        let top = rect.bottom + 18;
        if (top + cardHeight > innerHeight - 12) top = rect.top - cardHeight - 18;
        card.style.left = `${left}px`;
        card.style.top = `${Math.max(12, Math.min(top, innerHeight - cardHeight - 12))}px`;
    };

    const showStep = () => {
        const step = steps[index];
        openSection(step.section);
        if (step.details) document.querySelector(step.details)?.setAttribute('open', '');
        requestAnimationFrame(() => {
            target = document.querySelector(step.target);
            title.textContent = step.title;
            description.textContent = step.text;
            progress.textContent = `${index + 1} / ${steps.length}`;
            next.textContent = index === steps.length - 1 ? 'Finish' : 'Next';
            target?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
            requestAnimationFrame(() => { position(); next.focus({ preventScroll: true }); });
        });
    };

    const finish = () => {
        overlay.hidden = true;
        spotlight.hidden = true;
        target = undefined;
        previousFocus?.focus?.({ preventScroll: true });
    };

    const startTour = (group, opener) => {
        steps = TOURS[group] || [];
        if (!steps.length) return;
        previousFocus = document.activeElement;
        if (opener) previousFocus = opener;
        if (!matchMedia('(min-width: 880px)').matches) document.getElementById('open-settings-btn')?.click();
        index = 0;
        overlay.hidden = false;
        spotlight.hidden = false;
        showStep();
    };

    starts.forEach(button => button.addEventListener('click', () => startTour(button.dataset.tourStart, button)));
    next.addEventListener('click', () => { if (index === steps.length - 1) finish(); else { index += 1; showStep(); } });
    skip.addEventListener('click', finish);
    addEventListener('resize', position);
    addEventListener('scroll', position, true);
    document.addEventListener('keydown', (event) => {
        if (!overlay.hidden && event.key === 'Escape') { event.preventDefault(); finish(); }
    });
}
