/**
 * Centralized Application State Management
 * Manages all application state in a single, predictable location
 */
class AppState {
    constructor() {
        this.state = {
            // Audio state
            audio: {
                element: null,
                isPlaying: false,
                currentTime: 0,
                totalTime: 0,
                isMuted: false,
                isRepeat: false,
                volume: 1.0
            },
            
            // Vinyl state
            vinyl: {
                rotation: 0,
                isAnimating: false
            },
            
            // Lyrics state
            lyrics: {
                items: [],
                currentIndex: -1,
                color: '#8B4513'
            },
            
            // Export state
            export: {
                isExporting: false,
                progress: 0,
                message: '',
                mediaRecorder: null,
                recordedChunks: []
            },
            
            // UI state
            ui: {
                albumArt: null,
                songTitle: '',
                artistName: '',
                isControlsEnabled: true
            },
            
            // Settings state
            settings: {
                autoPlay: true,
                showLyrics: true,
                exportQuality: 'high'
            }
        };
        
        this.listeners = new Map();
        this.history = [];
        this.maxHistorySize = 50;
    }
    
    /**
     * Get current state
     * @param {string} path - Dot notation path to specific state (e.g., 'audio.isPlaying')
     * @returns {any} State value
     */
    get(path = null) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * Update state and notify listeners
     * @param {string} path - Dot notation path
     * @param {any} value - New value
     * @param {boolean} silent - Skip notifications if true
     */
    set(path, value, silent = false) {
        const oldState = JSON.parse(JSON.stringify(this.state));
        
        // Update state
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this.state);
        target[lastKey] = value;
        
        // Save to history
        this.saveToHistory(oldState, this.state);
        
        // Notify listeners
        if (!silent) {
            this.notifyListeners(path, value, oldState);
        }
    }
    
    /**
     * Update multiple state properties at once
     * @param {Object} updates - Object with path-value pairs
     */
    batchUpdate(updates) {
        const oldState = JSON.parse(JSON.stringify(this.state));
        
        Object.entries(updates).forEach(([path, value]) => {
            const keys = path.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((obj, key) => obj[key], this.state);
            target[lastKey] = value;
        });
        
        this.saveToHistory(oldState, this.state);
        this.notifyListeners('batch', updates, oldState);
    }
    
    /**
     * Subscribe to state changes
     * @param {string} path - Path to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        
        this.listeners.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(path);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }
    
    /**
     * Notify all listeners of state changes
     * @param {string} path - Changed path
     * @param {any} value - New value
     * @param {Object} oldState - Previous state
     */
    notifyListeners(path, value, oldState) {
        // Notify specific path listeners
        const specificListeners = this.listeners.get(path);
        if (specificListeners) {
            specificListeners.forEach(callback => {
                try {
                    callback(value, this.get(path), oldState);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
        
        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => {
                try {
                    callback(path, value, this.state, oldState);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
    }
    
    /**
     * Save state to history for undo/redo functionality
     * @param {Object} oldState - Previous state
     * @param {Object} newState - New state
     */
    saveToHistory(oldState, newState) {
        this.history.push({
            timestamp: Date.now(),
            oldState,
            newState
        });
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        const oldState = JSON.parse(JSON.stringify(this.state));
        
        // Reset to initial state
        this.state = {
            audio: {
                element: null,
                isPlaying: false,
                currentTime: 0,
                totalTime: 0,
                isMuted: false,
                isRepeat: false,
                volume: 1.0
            },
            vinyl: {
                rotation: 0,
                isAnimating: false
            },
            lyrics: {
                items: [],
                currentIndex: -1,
                color: '#8B4513'
            },
            export: {
                isExporting: false,
                progress: 0,
                message: '',
                mediaRecorder: null,
                recordedChunks: []
            },
            ui: {
                albumArt: null,
                songTitle: '',
                artistName: '',
                isControlsEnabled: true
            },
            settings: {
                autoPlay: true,
                showLyrics: true,
                exportQuality: 'high'
            }
        };
        
        this.notifyListeners('*', this.state, oldState);
    }
    
    /**
     * Get state snapshot for debugging
     * @returns {Object} State snapshot
     */
    getSnapshot() {
        return {
            state: JSON.parse(JSON.stringify(this.state)),
            historySize: this.history.length,
            listenersCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
        };
    }
}

// Create singleton instance
const appState = new AppState();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
}

window.appState = appState;
