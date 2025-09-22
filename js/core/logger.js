/**
 * Centralized Logging System
 * Replaces console.log statements with a proper logging system
 */
class Logger {
    constructor() {
        this.logLevel = this.getLogLevel();
        this.isDevelopment = this.isDevelopmentMode();
        this.logHistory = [];
        this.maxHistorySize = window.Constants?.UI.LOGGER_MAX_HISTORY || 100;
    }

    getLogLevel() {
        // Check for log level in localStorage or default based on environment
        const storedLevel = localStorage.getItem('vinyl-player-log-level');
        if (storedLevel) {
            return storedLevel;
        }
        
        // Default log level based on environment
        if (this.isDevelopmentMode()) {
            return 'info'; // Show more logs in development
        } else {
            return 'warn'; // Only show warnings and errors in production
        }
    }

    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    setLogLevel(level) {
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (validLevels.includes(level)) {
            this.logLevel = level;
            localStorage.setItem('vinyl-player-log-level', level);
        }
    }

    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        return {
            timestamp,
            level,
            message: formattedMessage,
            data,
            originalMessage: message
        };
    }

    addToHistory(logEntry) {
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }

    log(level, message, data = null) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatMessage(level, message, data);
        this.addToHistory(logEntry);

        // Only log to console in development or when explicitly enabled
        if (this.isDevelopment || this.logLevel === 'debug') {
            const consoleMethod = console[level] || console.log;
            if (data) {
                consoleMethod(logEntry.message, data);
            } else {
                consoleMethod(logEntry.message);
            }
        }

        // Emit log event for debugging tools
        if (window.eventBus) {
            window.eventBus.emit('logger:log', logEntry);
        }
    }

    debug(message, data = null) {
        this.log('debug', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    // Performance logging
    time(label) {
        if (this.shouldLog('debug')) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.shouldLog('debug')) {
            console.timeEnd(label);
        }
    }

    // Group logging for related operations
    group(label) {
        if (this.shouldLog('debug')) {
            console.group(label);
        }
    }

    groupEnd() {
        if (this.shouldLog('debug')) {
            console.groupEnd();
        }
    }

    // Get log history for debugging
    getHistory() {
        return [...this.logHistory];
    }


    // Module-specific logging
    module(moduleName) {
        return {
            debug: (message, data) => this.debug(`[${moduleName}] ${message}`, data),
            info: (message, data) => this.info(`[${moduleName}] ${message}`, data),
            warn: (message, data) => this.warn(`[${moduleName}] ${message}`, data),
            error: (message, data) => this.error(`[${moduleName}] ${message}`, data)
        };
    }

}

// Create global logger instance
const logger = new Logger();

// Add global methods for backward compatibility
window.logger = logger;
window.log = {
    debug: (message, data) => logger.debug(message, data),
    info: (message, data) => logger.info(message, data),
    warn: (message, data) => logger.warn(message, data),
    error: (message, data) => logger.error(message, data)
};


// Utility functions to avoid code duplication
window.safeLog = {
    debug: (message, data) => {
        if (window.logger) {
            window.logger.debug(message, data);
        } else {
            console.log(message, data);
        }
    },
    info: (message, data) => {
        if (window.logger) {
            window.logger.info(message, data);
        } else {
            console.info(message, data);
        }
    },
    warn: (message, data) => {
        if (window.logger) {
            window.logger.warn(message, data);
        } else {
            console.warn(message, data);
        }
    },
    error: (message, data) => {
        if (window.logger) {
            window.logger.error(message, data);
        } else {
            console.error(message, data);
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, logger };
}
