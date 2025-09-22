class EventBus {
    constructor() {
        this.events = new Map();
        this.middleware = [];
        this.debug = false;
    }
    
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
    
    once(eventName, callback) {
        return this.on(eventName, callback, { once: true });
    }
    
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
                window.safeLog.error(`[EventBus] Error in event handler for "${eventName}":`, error);
            }
        }
        
        // Remove one-time subscriptions
        toRemove.forEach(subscription => subscriptions.delete(subscription));
        
        if (subscriptions.size === 0) {
            this.events.delete(eventName);
        }
    }
    
    use(middleware) {
        this.middleware.push(middleware);
    }
    
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }
    
    listenerCount(eventName) {
        const subscriptions = this.events.get(eventName);
        return subscriptions ? subscriptions.size : 0;
    }
    
    eventNames() {
        return Array.from(this.events.keys());
    }
    
    setDebug(enabled) {
        this.debug = enabled;
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
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

const eventBus = new EventBus();

// Only enable debug mode in development
if (typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.protocol === 'file:')) {
    eventBus.setDebug(true);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
}

window.eventBus = eventBus;
