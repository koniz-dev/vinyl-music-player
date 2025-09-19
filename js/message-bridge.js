/**
 * Message Bridge Module
 * Handles communication between settings panel and vinyl player components
 * Forwards export-related messages to the appropriate components
 */

/**
 * Handle messages between settings and vinyl player components
 * @param {MessageEvent} event - The message event
 */
window.addEventListener('message', function(event) {
    const messageTypes = ['EXPORT_COMPLETE', 'EXPORT_PROGRESS', 'EXPORT_ERROR'];
    
    if (messageTypes.includes(event.data.type)) {
        // Forward export messages to settings component
        const settingsContainer = document.querySelector('.left-panel');
        if (settingsContainer) {
            // Trigger custom event for settings to handle
            const customEvent = new CustomEvent('exportMessage', { 
                detail: event.data 
            });
            settingsContainer.dispatchEvent(customEvent);
        }
    }
});
