window.addEventListener('message', function(event) {
    if (event.data.type === 'EXPORT_COMPLETE' || event.data.type === 'EXPORT_PROGRESS' || event.data.type === 'EXPORT_ERROR') {
        const settingsContainer = document.querySelector('.left-panel');
        if (settingsContainer) {
            const customEvent = new CustomEvent('exportMessage', { detail: event.data });
            settingsContainer.dispatchEvent(customEvent);
        }
    }
});
