import { hydrateStaticIcons } from './icons.js';
import { initTheme } from './theme.js';
import { initUiTheme } from './ui-theme.js';
import { initPlayer } from './player.js';
import { initSettings } from './settings.js';
import { initExport } from './export.js';
import { initDrawer } from './drawer.js';
import { initTour } from './tour.js';

hydrateStaticIcons();
initTheme();
initUiTheme();
initPlayer();
initSettings();
initExport();
initDrawer();
initTour();

if (new URLSearchParams(location.search).get('smoke') === '1') {
    import('../test/smoke-tone.js').then(({ loadSmokeTone }) => loadSmokeTone());
}

if (new URLSearchParams(location.search).get('pwa-smoke') === '1') {
    import('../test/pwa-cache-smoke.js').then(({ runPwaCacheSmoke }) => runPwaCacheSmoke());
}

if ('serviceWorker' in navigator) {
    // New workers call skipWaiting() and claim clients. Reload exactly once on
    // controller change so a release cannot leave a person looking at the old
    // cached HTML/CSS until they know to hard-refresh manually.
    let reloadingForWorker = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadingForWorker) return;
        reloadingForWorker = true;
        window.location.reload();
    });

    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('./service-worker.js');
        } catch {
            // Registration failed — site still works fine without SW.
        }
    });
}
