/**
 * Message Bridge Module
 * Handles communication between settings panel and vinyl player components
 * Forwards export-related messages to the appropriate components
 */
export class MessageBridge {
    constructor() {
        this.messageTypes = ['EXPORT_COMPLETE', 'EXPORT_PROGRESS', 'EXPORT_ERROR'];
        this.setupMessageListener();
    }

    /**
     * Setup message listener for communication between components
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (this.messageTypes.includes(event.data.type)) {
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
    }
}

/**
 * Initialize the message bridge when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    window.messageBridge = new MessageBridge();
});
