/**
 * Control Panel Index
 * Main entry point that loads all control panel modules using ES6 imports
 */

// Import all control panel modules
import { ControlPanelLyricsManager } from './lyrics-manager.js';
import { ModalManager } from './modal-manager.js';
import { UploadManager } from './upload-manager.js';
import { ExportManager } from './export-manager.js';
import { ColorManager } from './color-manager.js';

/**
 * Initialize all control panel modules when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules in dependency order
    const lyricsManager = new ControlPanelLyricsManager();
    const modalManager = new ModalManager(lyricsManager);
    const uploadManager = new UploadManager();
    const exportManager = new ExportManager();
    const colorManager = new ColorManager();
    
    // Make managers globally available for debugging
    window.controlPanel = {
        lyricsManager,
        modalManager,
        uploadManager,
        exportManager,
        colorManager
    };
});
