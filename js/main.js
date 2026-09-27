import { hydrateStaticIcons } from './icons.js';
import { initTheme } from './theme.js';
import { initUiTheme } from './ui-theme.js';
import { initPlayer } from './player.js';
import { initSettings } from './settings.js';
import { initExport } from './export.js';
import { initDrawer } from './drawer.js';
import { initTour } from './tour.js';
import { toast } from './toast.js';

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

const isLocalDevelopment = ['127.0.0.1', 'localhost', '::1'].includes(location.hostname);

if ('serviceWorker' in navigator && isLocalDevelopment) {
    // A cached app shell is valuable in production but actively misleading
    // during local development. Remove prior registrations once, then leave
    // localhost entirely network-driven.
    navigator.serviceWorker.getRegistrations().then(registrations =>
        Promise.all(registrations.map(registration => registration.unregister()))
    ).catch(() => {});
} else if ('serviceWorker' in navigator) {
    // Keep updates waiting until the person chooses to apply them. Automatic
    // skipWaiting() + reload makes every first visit visibly flash once.
    let updateRequested = false;
    let dismissUpdateToast = null;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // The first worker claims the initial page too, but that is not an
        // update and must not reload the page. Only reload after the Update
        // action has explicitly activated a waiting worker.
        if (updateRequested) window.location.reload();
    });

    const offerUpdate = (registration) => {
        const waiting = registration.waiting;
        if (!waiting || dismissUpdateToast) return;
        dismissUpdateToast = toast('A new version is ready.', {
            variant: 'info',
            duration: 0,
            action: {
                label: 'Update',
                onClick: () => {
                    updateRequested = true;
                    waiting.postMessage({ type: 'SKIP_WAITING' });
                },
            },
        });
    };

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            offerUpdate(registration);
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        offerUpdate(registration);
                    }
                });
            });
        } catch {
            // Registration failed — site still works fine without SW.
        }
    });
}
