// Mutable resources are scoped to exactly one export run. The coordinator
// replaces this object only after the prior run has completed or been cleaned.
export function createExportSession() {
    return {
        canvas: null,
        recorder: null,
        recordedChunks: [],
        animationId: null,
        timeoutId: null,
        progressInterval: null,
        exportAudio: null,
        audioCtx: null,
        canvasW: 720,
        canvasH: 1280,
        wasMainAudioPlaying: false,
        audioObjectUrl: null,
        finalized: false,
        exportLyrics: [],
        liveDomBindings: null,
        visibilityHandler: null,
        backgroundToastDismiss: null,
        exportEndTime: null,
        renderer: null,
    };
}
