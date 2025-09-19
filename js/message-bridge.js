// Handle messages between settings and vinyl player components
window.addEventListener('message', function(event) {
    if (event.data.type === 'EXPORT_COMPLETE' || event.data.type === 'EXPORT_PROGRESS' || event.data.type === 'EXPORT_ERROR') {
        // Forward export messages to settings component
        const settingsContainer = document.querySelector('.left-panel');
        if (settingsContainer) {
            // Trigger custom event for settings to handle
            const customEvent = new CustomEvent('exportMessage', { detail: event.data });
            settingsContainer.dispatchEvent(customEvent);
        }
    }
});
