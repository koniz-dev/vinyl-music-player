/**
 * Recording Manager
 * Handles MediaRecorder and video recording process
 */
export class RecordingManager {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isExporting = false;
        this.audioContext = null;
        console.log('Recording manager: Constructor called, this.mediaRecorder:', this.mediaRecorder);
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
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaElementSource(audio);
        const destination = this.audioContext.createMediaStreamDestination();
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
        console.log('Recording manager: MediaRecorder created, state:', this.mediaRecorder.state);

        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = async () => {
            console.log('Recording manager: mediaRecorder.onstop triggered');
            const webmBlob = new Blob(this.recordedChunks, { type: mimeType });
            console.log('Recording manager: Created blob, size:', webmBlob.size);
            
            if (callbacks.onComplete) {
                console.log('Recording manager: Calling onComplete with blob');
                callbacks.onComplete(webmBlob, mimeType);
            }
            
            this.isExporting = false;
        };

        // Start recording
        console.log('Recording manager: Starting recording, state before start:', this.mediaRecorder.state);
        this.mediaRecorder.start();
        console.log('Recording manager: Recording started, state after start:', this.mediaRecorder.state);
        console.log('Recording manager: End of startRecording, this.mediaRecorder:', this.mediaRecorder);
        
        return mimeType;
    }

    /**
     * Stop video recording
     */
    stopRecording() {
        console.log('Recording manager: stopRecording called, mediaRecorder exists:', !!this.mediaRecorder, 'state:', this.mediaRecorder?.state);
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            console.log('Recording manager: Stopping mediaRecorder');
            this.mediaRecorder.stop();
        } else {
            console.log('Recording manager: Cannot stop - mediaRecorder not in recording state');
        }
        
        this.isExporting = false;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('Recording manager: cleanup called, mediaRecorder exists before:', !!this.mediaRecorder);
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isExporting = false;
        console.log('Recording manager: cleanup completed, mediaRecorder exists after:', !!this.mediaRecorder);
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
        console.log('Recording manager: setExporting called with status:', status, 'mediaRecorder exists:', !!this.mediaRecorder);
        this.isExporting = status;
    }
}

