/**
 * Export Progress Manager
 * Handles export progress tracking and reporting
 */
export class ExportProgressManager {
    constructor() {
        this.progressInterval = null;
        this.exportTimeout = null;
    }

    /**
     * Start progress tracking
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Function} onComplete - Callback when export completes
     * @param {Function} onError - Callback when export errors
     */
    startProgressTracking(audio, onComplete, onError) {
        // Set timeout for export
        this.exportTimeout = setTimeout(() => {
            this.stopProgressTracking();
            if (onError) {
                onError('Export timeout. Please try again with a shorter audio file.');
            }
        }, 5 * 60 * 1000);

        // Update progress
        const duration = audio.duration;
        const startTime = Date.now();
        
        this.progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(20 + (elapsed / duration) * 75, 100);
            
            this.reportProgress(progress, `Recording... ${Math.round(progress)}%`);

            if (elapsed >= duration) {
                console.log('Progress manager: Duration reached, calling onComplete');
                this.stopProgressTracking();
                // Add a small delay to ensure recording is complete
                setTimeout(() => {
                    if (onComplete) {
                        console.log('Progress manager: Calling onComplete callback');
                        onComplete();
                    }
                }, 100);
            }
        }, 100);
    }

    /**
     * Stop progress tracking
     */
    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        if (this.exportTimeout) {
            clearTimeout(this.exportTimeout);
            this.exportTimeout = null;
        }
    }

    /**
     * Report progress to control panel
     * @param {number} progress - Progress percentage
     * @param {string} message - Progress message
     */
    reportProgress(progress, message) {
        window.postMessage({
            type: 'EXPORT_PROGRESS',
            progress: progress,
            message: message
        }, '*');
    }

    /**
     * Report export complete
     * @param {Blob} videoBlob - Exported video blob
     * @param {string} fileName - File name
     */
    reportComplete(videoBlob, fileName) {
        this.reportProgress(100, 'WebM export complete!');
        
        window.postMessage({
            type: 'EXPORT_COMPLETE',
            videoBlob: videoBlob,
            fileName: fileName
        }, '*');
    }

    /**
     * Report export error
     * @param {string} error - Error message
     */
    reportError(error) {
        window.postMessage({
            type: 'EXPORT_ERROR',
            error: error
        }, '*');
    }
}
