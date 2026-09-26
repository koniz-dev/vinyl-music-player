/* A small, fully local onboarding tour. It deliberately points at section
 * headers rather than opening every optional panel: the tour explains the
 * structure without leaving the user's settings drawer expanded afterwards. */

const SEEN_KEY = 'vinylFeatureTourSeenV1';

const STEPS = [
    { target: '#audio-upload-area', title: 'Add a song', description: 'Drop an audio file here. The player reads it in your browser; the file is never uploaded.' },
    { target: '[data-section-key="artwork"] .section-toggle', title: 'Give it a cover', description: 'Artwork is optional. Upload an image for the record label and ambient background, or open the AI cover tool when you want to send a prompt to Pollinations.' },
    { target: '[data-section-key="lyrics"] .section-toggle', title: 'Add or time lyrics', description: 'Add lines manually or import JSON/LRC. Inside this section, Auto-sync can turn plain, one-line-per-row lyrics into timed lyrics with on-device AI.' },
    { target: '[data-section-key="lyrics"] .section-toggle', title: 'Use lyric extras when useful', description: 'Open More lyric tools in this section for LRC export, an opt-in online lyric lookup, and local translation. Large AI model downloads always ask first and can be removed later.' },
    { target: '[data-section-key="appearance"] .section-toggle', title: 'Set the visual mood', description: 'Choose a palette, colors, and font. The Enhancements panel keeps optional visualizer and local theme suggestion controls out of the way.' },
    { target: '#export-btn', title: 'Export your video', description: 'Choose the aspect ratio, format, and optional time range in Export. This button stays visible and creates the video locally once audio is ready.' },
];

export function initTour() {
    const overlay = document.getElementById('tour-overlay');
    const startButton = document.getElementById('tour-btn');
    const openSettings = document.getElementById('open-settings-btn');
    const title = document.getElementById('tour-title');
    const description = document.getElementById('tour-description');
    const progress = document.getElementById('tour-progress');
    const back = document.getElementById('tour-back-btn');
    const next = document.getElementById('tour-next-btn');
    const skip = document.getElementById('tour-skip-btn');
    if (!overlay || !startButton || !title || !description || !progress || !back || !next || !skip) return;

    let stepIndex = 0;
    let highlighted;
    let previouslyFocused;

    const clearHighlight = () => {
        highlighted?.classList.remove('tour-target');
        highlighted = undefined;
    };

    const showStep = () => {
        const step = STEPS[stepIndex];
        const target = document.querySelector(step.target);
        clearHighlight();
        title.textContent = step.title;
        description.textContent = step.description;
        progress.textContent = `${stepIndex + 1} of ${STEPS.length}`;
        back.hidden = stepIndex === 0;
        next.textContent = stepIndex === STEPS.length - 1 ? 'Finish' : 'Next';
        if (target) {
            highlighted = target;
            target.classList.add('tour-target');
            target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        }
        next.focus({ preventScroll: true });
    };

    const finish = () => {
        clearHighlight();
        overlay.hidden = true;
        document.body.classList.remove('tour-active');
        try { localStorage.setItem(SEEN_KEY, 'true'); } catch {}
        previouslyFocused?.focus?.({ preventScroll: true });
    };

    const start = () => {
        previouslyFocused = document.activeElement;
        stepIndex = 0;
        if (openSettings && !matchMedia('(min-width: 880px)').matches) openSettings.click();
        overlay.hidden = false;
        document.body.classList.add('tour-active');
        requestAnimationFrame(showStep);
    };

    startButton.addEventListener('click', start);
    skip.addEventListener('click', finish);
    back.addEventListener('click', () => { if (stepIndex > 0) { stepIndex -= 1; showStep(); } });
    next.addEventListener('click', () => {
        if (stepIndex === STEPS.length - 1) finish();
        else { stepIndex += 1; showStep(); }
    });
    document.addEventListener('keydown', (event) => {
        if (!overlay.hidden && event.key === 'Escape') { event.preventDefault(); finish(); }
    });

    const query = new URLSearchParams(location.search);
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === 'true'; } catch {}
    if (!seen && query.get('smoke') !== '1' && query.get('pwa-smoke') !== '1') setTimeout(start, 450);
}
