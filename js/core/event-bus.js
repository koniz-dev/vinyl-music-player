/**
 * Event Bus System
 * Centralized event communication between modules
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.middleware = [];
        this.debug = false;
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Event handler
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        const subscription = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateId()
        };
        
        this.events.get(eventName).add(subscription);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to "${eventName}"`, subscription.id);
        }
        
        // Return unsubscribe function
        return () => this.off(eventName, subscription.id);
    }
    
    /**
     * Subscribe to an event once
     * @param {string} eventName - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback) {
        return this.on(eventName, callback, { once: true });
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {string|Function} identifier - Subscription ID or callback function
     */
    off(eventName, identifier) {
        const subscriptions = this.events.get(eventName);
        if (!subscriptions) return;
        
        if (typeof identifier === 'string') {
            // Remove by ID
            for (const subscription of subscriptions) {
                if (subscription.id === identifier) {
                    subscriptions.delete(subscription);
                    break;
                }
            }
        } else if (typeof identifier === 'function') {
            // Remove by callback
            for (const subscription of subscriptions) {
                if (subscription.callback === identifier) {
                    subscriptions.delete(subscription);
                    break;
                }
            }
        }
        
        if (subscriptions.size === 0) {
            this.events.delete(eventName);
        }
        
        if (this.debug) {
            console.log(`[EventBus] Unsubscribed from "${eventName}"`);
        }
    }
    
    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {any} data - Event data
     * @param {Object} options - Emission options
     */
    emit(eventName, data = null, options = {}) {
        const subscriptions = this.events.get(eventName);
        if (!subscriptions || subscriptions.size === 0) {
            if (this.debug) {
                console.log(`[EventBus] No listeners for "${eventName}"`);
            }
            return;
        }
        
        // Apply middleware
        let processedData = data;
        for (const middleware of this.middleware) {
            processedData = middleware(eventName, processedData, options);
        }
        
        // Sort subscriptions by priority (higher priority first)
        const sortedSubscriptions = Array.from(subscriptions).sort((a, b) => b.priority - a.priority);
        
        if (this.debug && !eventName.includes('timeUpdate')) {
            console.log(`[EventBus] Emitting "${eventName}" to ${sortedSubscriptions.length} listeners`, processedData);
        }
        
        // Execute callbacks
        const toRemove = [];
        for (const subscription of sortedSubscriptions) {
            try {
                subscription.callback(processedData, options);
                
                if (subscription.once) {
                    toRemove.push(subscription);
                }
            } catch (error) {
                console.error(`[EventBus] Error in event handler for "${eventName}":`, error);
            }
        }
        
        // Remove one-time subscriptions
        toRemove.forEach(subscription => subscriptions.delete(subscription));
        
        if (subscriptions.size === 0) {
            this.events.delete(eventName);
        }
    }
    
    /**
     * Add middleware for event processing
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        this.middleware.push(middleware);
    }
    
    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }
    
    /**
     * Get listener count for an event
     * @param {string} eventName - Event name
     * @returns {number} Listener count
     */
    listenerCount(eventName) {
        const subscriptions = this.events.get(eventName);
        return subscriptions ? subscriptions.size : 0;
    }
    
    /**
     * Get all event names
     * @returns {Array<string>} Event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
    
    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
    
    /**
     * Generate unique ID for subscriptions
     * @returns {string} Unique ID
     */
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Create a namespaced event bus
     * @param {string} namespace - Namespace prefix
     * @returns {Object} Namespaced event bus
     */
    namespace(namespace) {
        return {
            on: (eventName, callback, options) => 
                this.on(`${namespace}:${eventName}`, callback, options),
            once: (eventName, callback) => 
                this.once(`${namespace}:${eventName}`, callback),
            off: (eventName, identifier) => 
                this.off(`${namespace}:${eventName}`, identifier),
            emit: (eventName, data, options) => 
                this.emit(`${namespace}:${eventName}`, data, options)
        };
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Enable debug in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    eventBus.setDebug(true);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
}

window.eventBus = eventBus;
