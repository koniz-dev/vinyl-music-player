import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, commonCss, indexCss, vinylCss, main, uiTheme, tour, launcher, stopper] = await Promise.all([
    readFile('./index.html', 'utf8'),
    readFile('./styles/common.css', 'utf8'),
    readFile('./styles/index.css', 'utf8'),
    readFile('./styles/vinyl-player.css', 'utf8'),
    readFile('./js/main.js', 'utf8'),
    readFile('./js/ui-theme.js', 'utf8'),
    readFile('./js/tour.js', 'utf8'),
    readFile('./scripts/open-local.mjs', 'utf8'),
    readFile('./scripts/stop-local.mjs', 'utf8'),
]);

const [settings, dialog, outputSettings, exportControls, exporter, exportSupport, exportDom, exportCapture, exportRenderer, exportSession, colorManager, mediaControls, autoSyncControls, translationControls, lyricsImportControls] = await Promise.all([
    readFile('./js/settings.js', 'utf8'),
    readFile('./js/dialog.js', 'utf8'),
    readFile('./js/output-settings.js', 'utf8'),
    readFile('./js/export-controls.js', 'utf8'),
    readFile('./js/export.js', 'utf8'),
    readFile('./js/export-support.js', 'utf8'),
    readFile('./js/export-dom.js', 'utf8'),
    readFile('./js/export-capture.js', 'utf8'),
    readFile('./js/export-renderer.js', 'utf8'),
    readFile('./js/export-session.js', 'utf8'),
    readFile('./js/color-manager.js', 'utf8'),
    readFile('./js/media-controls.js', 'utf8'),
    readFile('./js/autosync-controls.js', 'utf8'),
    readFile('./js/translation-controls.js', 'utf8'),
    readFile('./js/lyrics-import-controls.js', 'utf8'),
]);

assert.ok(!html.includes('guide-modal') && !html.includes('data-guide-target'), 'the retired guide panel must not ship');
assert.ok(!html.includes('vinyl-spindle'), 'the vinyl center must not render a spindle dot');
assert.match(vinylCss, /radial-gradient\([\s\S]*25\.3%/, 'vinyl must retain subtle concentric record grooves');
assert.ok(!vinylCss.includes('repeating-radial-gradient'), 'vinyl grooves must not use a synthetic repeating pattern');
assert.match(vinylCss, /vinyl-album-art[\s\S]*data:image\/svg\+xml/, 'the empty vinyl label must retain its music placeholder');
assert.match(html, /role="radiogroup"[\s\S]*role="radio"/, 'theme choices must expose radio semantics');
assert.match(uiTheme, /aria-checked/, 'theme logic must keep radio state current');
assert.match(uiTheme, /ArrowLeft/, 'theme radios must support keyboard navigation');
assert.match(indexCss, /\.frame \{[\s\S]*--bg-0: #09090b/, 'video frame must own its dark canvas tokens');
assert.match(commonCss, /data-ui-theme="light"/, 'workspace light theme must remain available');
assert.ok(!indexCss.includes('tour-menu-options'), 'retired tour menu CSS must not ship');
assert.match(html, /tour-card" role="region"/, 'walkthrough must remain a non-blocking coachmark');
assert.match(tour, /card\.focus/, 'walkthrough must announce its current step to keyboard users');
assert.match(indexCss, /prefers-reduced-motion: reduce/, 'walkthrough motion must honor user preference');
assert.match(indexCss, /height: 100dvh/, 'mobile layout must follow dynamic browser viewport height');
assert.match(indexCss, /orientation: landscape/, 'short landscape phones must receive a dedicated layout');
assert.match(vinylCss, /width: min\(260px, 88cqi, 45cqb\)/,
    'mobile vinyl must fit narrow video frames instead of being clipped');
assert.match(indexCss, /\.section-guide-btn \{\s*width: 40px/, 'mobile guide controls need a usable touch target');
assert.match(main, /offerUpdate/, 'a waiting service worker must offer an in-app update action');
assert.match(main, /SKIP_WAITING/, 'the update action must explicitly activate the waiting worker');
assert.match(main, /updateRequested/, 'the page must reload only after the update action is chosen');
assert.match(main, /currentWaiting !== waiting/, 'the update action must reject a stale waiting worker');
assert.match(main, /waiting\.state !== 'installed'/, 'only a ready waiting worker may be activated');
assert.match(await readFile('./styles/toast.css', 'utf8'), /min-height: 36px/,
    'toast actions must retain a usable touch target');
assert.match(main, /isLocalDevelopment/, 'localhost must not retain a stale PWA shell during development');
assert.match(main, /getRegistrations\(\)/, 'localhost must clear prior service worker registrations');
assert.ok(!/window\.(confirm|prompt|alert)\s*\(/.test(settings),
    'settings actions must use the in-app dialog instead of browser prompts');
assert.match(dialog, /confirmDialog/, 'the reusable in-app confirmation dialog must remain available');
assert.match(html, /id="app-dialog"/, 'confirmation and selection actions must render in the app shell');
assert.match(settings, /initOutputSettings/, 'settings must delegate output controls to their boundary module');
assert.match(settings, /initExportControls/, 'settings must delegate export controls to their boundary module');
assert.match(settings, /initMediaControls/, 'settings must delegate media controls to their boundary module');
assert.ok(!settings.includes('function handleAudioFile'), 'settings must not retain duplicate media handlers');
assert.match(outputSettings, /Events\.UPDATE_ASPECT_RATIO/, 'output settings must preserve the aspect-ratio event contract');
assert.match(exportControls, /Events\.EXPORT_REQUESTED/, 'export controls must own the export request boundary');
assert.match(exportControls, /Events\.EXPORT_PROGRESS/, 'export controls must receive export progress');
assert.match(exporter, /initExportSupportModal/, 'export must initialize its support UI boundary');
assert.ok(!exporter.includes('function debugBrowserSupport'), 'export must not retain a duplicate browser-support implementation');
assert.match(exportSupport, /DEBUG_BROWSER_SUPPORT|browser-support-modal/, 'browser support UI must remain independently implemented');
assert.match(exportDom, /snapshotExportDom|restoreExportDom/, 'export DOM bridge must own temporary preview state');
assert.ok(!exporter.includes('function snapshotLiveDom'), 'exporter must not retain DOM bridge implementation');
assert.match(exportCapture, /captureDomToCanvas|captureSvgToCanvas/, 'export capture primitives must have an independent boundary');
assert.ok(!exporter.includes('function captureViaH2I'), 'exporter must not retain capture implementation');
assert.match(exportRenderer, /createExportRenderer|drawFrame/, 'canvas compositing must have an independent renderer boundary');
assert.match(exporter, /createExportRenderer/, 'exporter must compose the renderer into each export run');
assert.ok(!exporter.includes('function computeLayerRects'), 'exporter must not retain renderer geometry implementation');
assert.ok(!exporter.includes('async function setupExportLayers'), 'exporter must not retain layer-cache implementation');
assert.match(exportSession, /createExportSession|recordedChunks/, 'one export run must own its mutable resources');
assert.match(exporter, /const session = createExportSession\(\);[\s\S]*active = session;/,
    'exporter must create and retain a distinct resource session per run');
assert.match(exporter, /active !== session/, 'stale export callbacks must not affect a newer session');
assert.match(exporter, /function renderLoop\(session\)/, 'render loop must be scoped to one export session');
assert.match(exporter, /requestAnimationFrame\(\(\) => renderLoop\(session\)\)/,
    'a stale animation frame must not schedule work for a newer session');
assert.ok(!colorManager.includes('state.lyricsColor ='), 'lyrics color state must have one writer in player.js');
for (const target of ['title', 'artist', 'lyrics']) {
    assert.match(html, new RegExp(`id="font-size-${target}"[^>]*type="range"`),
        `appearance controls must expose a ${target} text-size slider`);
}
assert.match(await readFile('./js/font-manager.js', 'utf8'), /playerFontScales|--font-player-\$\{target\}-scale/,
    'font manager must persist and apply separate text sizes');
assert.match(vinylCss, /--font-player-title-scale|--font-player-artist-scale|--font-player-lyrics-scale/,
    'player typography must honor the selected text sizes');
assert.match(vinylCss, /calc\(22px \* var\(--font-player-title-scale\)\)/,
    'mobile title typography must honor the selected text size');
assert.match(mediaControls, /readId3Metadata/, 'media controls must own local metadata autofill');
assert.match(settings, /initAutoSyncControls/, 'settings must delegate Whisper UI to its controller');
assert.match(settings, /initTranslationControls/, 'settings must delegate translation UI to its controller');
assert.match(autoSyncControls, /runAutoSync/, 'auto-sync controls must own the Whisper workflow');
assert.match(translationControls, /translateLyrics/, 'translation controls must own translation workflow');
assert.match(settings, /initLyricsImportControls/, 'settings must delegate lyric import UI to its controller');
assert.match(lyricsImportControls, /findSyncedLyrics/, 'lyric import controls must own LRCLIB lookup');
assert.match(await readFile('./test/smoke-tone.js', 'utf8'), /smoke-seconds|EXPORT_CANCELLED/,
    'browser smoke fixture must support a longer cancel/restart lifecycle check');
assert.match(launcher, /waitForAppServer/, 'background launcher must wait for readiness');
assert.match(launcher, /APP_MARKER/, 'background launcher must verify the app, not only a port');
assert.match(stopper, /Refused to stop/, 'stop command must refuse an unowned process');

console.log('UI shell and launcher safeguards verified');
