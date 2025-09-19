/**
 * Browser Support Manager
 * Handles browser capability detection and debugging
 */
export class BrowserSupportManager {
    /**
     * Debug browser support
     */
    debugBrowserSupport() {
        const support = {
            mediaRecorder: !!window.MediaRecorder,
            canvas: !!document.createElement('canvas').getContext,
            audio: !!window.Audio,
            webm: MediaRecorder.isTypeSupported('video/webm'),
            webm_vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
            webm_vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
            userAgent: navigator.userAgent
        };
        
        let message = 'Browser Support Check:\n\n';
        message += `MediaRecorder: ${support.mediaRecorder ? '✅' : '❌'}\n`;
        message += `Canvas: ${support.canvas ? '✅' : '❌'}\n`;
        message += `Audio: ${support.audio ? '✅' : '❌'}\n`;
        message += `WebM: ${support.webm ? '✅' : '❌'}\n`;
        message += `WebM VP8: ${support.webm_vp8 ? '✅' : '❌'}\n`;
        message += `WebM VP9: ${support.webm_vp9 ? '✅' : '❌'}\n`;
        message += `Browser: ${navigator.userAgent.split(' ')[0]}`;
        
        alert(message);
    }

    /**
     * Check if browser supports video export
     * @returns {boolean} Support status
     */
    supportsVideoExport() {
        return !!window.MediaRecorder && !!document.createElement('canvas').getContext && !!window.Audio;
    }

    /**
     * Get supported MIME types
     * @returns {Array} Array of supported MIME types
     */
    getSupportedMimeTypes() {
        const types = [];
        
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            types.push('video/webm;codecs=vp9,opus');
        }
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            types.push('video/webm;codecs=vp8,opus');
        }
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            types.push('video/webm;codecs=vp9');
        }
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            types.push('video/webm;codecs=vp8');
        }
        if (MediaRecorder.isTypeSupported('video/webm')) {
            types.push('video/webm');
        }
        
        return types;
    }
}
