/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */
class ErrorHandler {
    constructor() {
        this.logger = window.logger;
        this.eventBus = window.eventBus;
        this.toastManager = window.toastManager;
        this.setupGlobalErrorHandlers();
    }

    setupGlobalErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError('Global Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Unhandled Promise Rejection', event.reason);
        });
    }

    handleError(context, error, additionalInfo = {}) {
        const errorInfo = this.formatError(context, error, additionalInfo);
        
        // Log the error
        this.logger.error(errorInfo.message, errorInfo);
        
        // Emit error event
        if (this.eventBus) {
            this.eventBus.emit('app:error', errorInfo);
        }
        
        // Show user-friendly error message
        this.showUserError(errorInfo);
        
        return errorInfo;
    }

    formatError(context, error, additionalInfo = {}) {
        let message = 'An unexpected error occurred';
        let userMessage = 'Something went wrong. Please try again.';
        let code = 'UNKNOWN_ERROR';

        if (error instanceof Error) {
            message = error.message;
            code = this.getErrorCode(error);
            userMessage = this.getUserFriendlyMessage(error);
        } else if (typeof error === 'string') {
            message = error;
            userMessage = error;
        }

        return {
            context,
            message,
            userMessage,
            code,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            ...additionalInfo
        };
    }

    getErrorCode(error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return 'NETWORK_ERROR';
        }
        if (errorMessage.includes('timeout')) {
            return 'TIMEOUT_ERROR';
        }
        if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            return 'PERMISSION_ERROR';
        }
        if (errorMessage.includes('not supported') || errorMessage.includes('unsupported')) {
            return 'BROWSER_NOT_SUPPORTED';
        }
        if (errorMessage.includes('file') && errorMessage.includes('type')) {
            return 'INVALID_FILE_TYPE';
        }
        if (errorMessage.includes('size') || errorMessage.includes('large')) {
            return 'FILE_TOO_LARGE';
        }
        if (errorMessage.includes('audio') || errorMessage.includes('media')) {
            return 'MEDIA_ERROR';
        }
        
        return 'UNKNOWN_ERROR';
    }

    getUserFriendlyMessage(error) {
        const code = this.getErrorCode(error);
        
        const messages = {
            NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
            TIMEOUT_ERROR: 'Operation timed out. Please try again.',
            PERMISSION_ERROR: 'Permission denied. Please check your browser settings.',
            BROWSER_NOT_SUPPORTED: 'Your browser does not support this feature. Please use a modern browser.',
            INVALID_FILE_TYPE: 'Invalid file type. Please select a supported audio or image file.',
            FILE_TOO_LARGE: 'File is too large. Please select a smaller file.',
            MEDIA_ERROR: 'Media playback error. Please try a different file.',
            UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
        };
        
        return messages[code] || messages.UNKNOWN_ERROR;
    }

    showUserError(errorInfo) {
        if (this.toastManager) {
            this.toastManager.showError('Error', errorInfo.userMessage);
        }
    }

    // Specific error handlers for different modules
    handleAudioError(error, context = 'Audio Player') {
        return this.handleError(context, error, { type: 'audio' });
    }

    handleExportError(error, context = 'Export Manager') {
        return this.handleError(context, error, { type: 'export' });
    }

    handleLyricsError(error, context = 'Lyrics Manager') {
        return this.handleError(context, error, { type: 'lyrics' });
    }

    handleFileError(error, context = 'File Utils') {
        return this.handleError(context, error, { type: 'file' });
    }

    // Validation error handler
    handleValidationError(errors, context = 'Validation') {
        const errorMessage = Array.isArray(errors) ? errors.join(', ') : errors;
        return this.handleError(context, new Error(errorMessage), { type: 'validation' });
    }

    // Async error wrapper
    async wrapAsync(fn, context = 'Async Operation') {
        try {
            return await fn();
        } catch (error) {
            this.handleError(context, error);
            throw error;
        }
    }

    // Promise error wrapper
    wrapPromise(promise, context = 'Promise Operation') {
        return promise.catch(error => {
            this.handleError(context, error);
            throw error;
        });
    }

    // Retry mechanism with error handling
    async retry(fn, maxRetries = 3, delay = 1000, context = 'Retry Operation') {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    this.handleError(`${context} (Failed after ${maxRetries} attempts)`, error);
                    throw error;
                }
                
                this.logger.warn(`${context} attempt ${attempt} failed, retrying...`, error.message);
                await this.delay(delay * attempt);
            }
        }
        
        throw lastError;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get error statistics
    getErrorStats() {
        const logs = this.logger.getHistory();
        const errors = logs.filter(log => log.level === 'error');
        
        const stats = {
            total: errors.length,
            byCode: {},
            byContext: {},
            recent: errors.slice(-10)
        };
        
        errors.forEach(error => {
            const code = error.data?.code || 'UNKNOWN';
            const context = error.data?.context || 'Unknown';
            
            stats.byCode[code] = (stats.byCode[code] || 0) + 1;
            stats.byContext[context] = (stats.byContext[context] || 0) + 1;
        });
        
        return stats;
    }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, errorHandler };
}

window.errorHandler = errorHandler;
