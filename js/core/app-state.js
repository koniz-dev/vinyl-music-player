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
                color: this.calculateLyricsColor()
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
    
    get(path = null) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
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
    
    notifyListeners(path, value, oldState) {
        // Notify specific path listeners
        const specificListeners = this.listeners.get(path);
        if (specificListeners) {
            specificListeners.forEach(callback => {
                try {
                    callback(value, this.get(path), oldState);
                } catch (error) {
                    window.safeLog.error('State listener error:', error);
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
                    window.safeLog.error('State listener error:', error);
                }
            });
        }
    }
    
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
                color: this.calculateLyricsColor()
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
    
    calculateLyricsColor() {
        return ColorHelper.calculateLyricsColor(window.Constants.PLAYER_BASE_COLOR);
    }
    
    // Color methods are now handled by ColorHelper
}

const appState = new AppState();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
}

window.appState = appState;
