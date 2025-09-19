/**
 * Canvas Manager
 * Handles export canvas creation and management
 */
export class CanvasManager {
    constructor() {
        this.exportCanvas = null;
        this.exportCtx = null;
    }

    /**
     * Create export canvas with proper dimensions
     */
    createExportCanvas() {
        this.exportCanvas = document.createElement('canvas');
        
        let canvasWidth = 720;
        let canvasHeight = 1280;
        
        const dimensionSources = [
            () => {
                const vinylPlayer = document.querySelector('.player-container');
                if (vinylPlayer) {
                    const rect = vinylPlayer.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        return { width: rect.width, height: rect.height };
                    }
                }
                return null;
            },
            () => {
                const iframe = window.frameElement;
                if (iframe) {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        return { width: rect.width, height: rect.height };
                    }
                }
                return null;
            },
            () => {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                if (windowWidth > 0 && windowHeight > 0) {
                    const aspectRatio = 9 / 16;
                    if (windowWidth / windowHeight > aspectRatio) {
                        return { width: windowHeight * aspectRatio, height: windowHeight };
                    } else {
                        return { width: windowWidth, height: windowWidth / aspectRatio };
                    }
                }
                return null;
            }
        ];
        
        for (const getDimensions of dimensionSources) {
            try {
                const dimensions = getDimensions();
                if (dimensions) {
                    canvasWidth = dimensions.width;
                    canvasHeight = dimensions.height;
                    break;
                }
            } catch (e) {
            }
        }
        
        this.exportCanvas.width = Math.max(canvasWidth, 400);
        this.exportCanvas.height = Math.max(canvasHeight, 600);
        
        this.exportCtx = this.exportCanvas.getContext('2d');
        
        this.exportCtx.imageSmoothingEnabled = true;
        this.exportCtx.imageSmoothingQuality = 'high';
    }

    /**
     * Get canvas context
     * @returns {CanvasRenderingContext2D} Canvas context
     */
    getContext() {
        return this.exportCtx;
    }

    /**
     * Get canvas element
     * @returns {HTMLCanvasElement} Canvas element
     */
    getCanvas() {
        return this.exportCanvas;
    }

    /**
     * Get canvas dimensions
     * @returns {Object} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.exportCanvas.width,
            height: this.exportCanvas.height
        };
    }
}
