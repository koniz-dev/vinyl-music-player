import { initTheme } from './theme.js';
import { initPlayer } from './player.js';
import { initSettings } from './settings.js';
import { initExport } from './export.js';
import { initDrawer } from './drawer.js';

initTheme();
initPlayer();
initSettings();
initExport();
initDrawer();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
}
