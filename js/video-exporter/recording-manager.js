/**
 * Recording Manager
 * Handles MediaRecorder and video recording process
 */
export class RecordingManager {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isExporting = false;
    }

    /**
     * Start video recording
     * @param {HTMLCanvasElement} canvas - Canvas to record
     * @param {HTMLAudioElement} audio - Audio element
     * @param {Object} callbacks - Callback functions
     */
    async startRecording(canvas, audio, callbacks) {
        if (this.isExporting) {
            return;
        }
        this.isExporting = true;

        const canvasStream = canvas.captureStream(30);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destination.stream.getAudioTracks()
        ]);
        
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        }
    
        this.mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: mimeType
        });

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            const webmBlob = new Blob(this.recordedChunks, { type: mimeType });
            
            if (callbacks.onComplete) {
                callbacks.onComplete(webmBlob, mimeType);
            }
            
            this.isExporting = false;
        };

        // Start recording
        this.mediaRecorder.start();
        
        return mimeType;
    }

    /**
     * Stop video recording
     */
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        this.isExporting = false;
    }

    /**
     * Check if currently exporting
     * @returns {boolean} Export status
     */
    isCurrentlyExporting() {
        return this.isExporting;
    }

    /**
     * Set export status
     * @param {boolean} status - Export status
     */
    setExporting(status) {
        this.isExporting = status;
    }
}
