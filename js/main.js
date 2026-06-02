import { hydrateStaticIcons } from './icons.js';
import { initTheme } from './theme.js';
import { initPlayer } from './player.js';
import { initSettings } from './settings.js';
import { initExport } from './export.js';
import { initDrawer } from './drawer.js';
import { toast } from './toast.js';

hydrateStaticIcons();
initTheme();
initPlayer();
initSettings();
initExport();
initDrawer();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('./service-worker.js');

            // A new SW has been found and is installing.
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    // 'installed' + already a controller = there's a stale page to refresh.
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        toast('A new version is available.', {
                            variant: 'info',
                            duration: 0, // sticky until user acts
                            action: {
                                label: 'Reload',
                                onClick: () => window.location.reload(),
                            },
                        });
                    }
                });
            });
        } catch {
            // Registration failed — site still works fine without SW.
        }
    });
}
