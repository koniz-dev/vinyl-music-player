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

assert.ok(!html.includes('guide-modal') && !html.includes('data-guide-target'), 'the retired guide panel must not ship');
assert.ok(!html.includes('vinyl-spindle'), 'the vinyl center must not render a spindle dot');
assert.ok(!vinylCss.includes('repeating-radial-gradient'), 'vinyl grooves must not alias into radial spokes');
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
assert.match(main, /controllerchange/, 'a new service worker must refresh the stale app shell once');
assert.match(launcher, /waitForAppServer/, 'background launcher must wait for readiness');
assert.match(launcher, /APP_MARKER/, 'background launcher must verify the app, not only a port');
assert.match(stopper, /Refused to stop/, 'stop command must refuse an unowned process');

console.log('UI shell and launcher safeguards verified');
