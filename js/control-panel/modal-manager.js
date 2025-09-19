/**
 * Modal Management Module
 * Handles the developer lyrics import modal
 */
export class ModalManager {
    constructor(lyricsManager) {
        this.lyricsManager = lyricsManager;
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.devLyricsBtn = document.getElementById('dev-lyrics-btn');
        this.devLyricsModal = document.getElementById('dev-lyrics-modal');
        this.modalCloseBtn = document.getElementById('modal-close-btn');
        this.modalCancelBtn = document.getElementById('modal-cancel-btn');
        this.modalImportBtn = document.getElementById('modal-import-btn');
        this.jsonLyricsInput = document.getElementById('json-lyrics-input');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Modal Event Listeners
        this.devLyricsBtn.addEventListener('click', () => this.openModal());
        this.modalCloseBtn.addEventListener('click', () => this.closeModal());
        this.modalCancelBtn.addEventListener('click', () => this.closeModal());

        // Close modal when clicking outside
        this.devLyricsModal.addEventListener('click', (e) => {
            if (e.target === this.devLyricsModal) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.devLyricsModal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
        
        // Import button event listener
        this.modalImportBtn.addEventListener('click', () => this.importLyricsFromJSON());
    }
    
    /**
     * Open the developer lyrics modal
     */
    openModal() {
        this.devLyricsModal.classList.remove('hidden');
        this.devLyricsModal.style.display = 'flex';
        this.jsonLyricsInput.focus();
    }

    /**
     * Close the developer lyrics modal
     */
    closeModal() {
        this.devLyricsModal.classList.add('hidden');
        this.devLyricsModal.style.display = 'none';
        this.jsonLyricsInput.value = '';
    }
    /**
     * Import lyrics from JSON data
     */
    importLyricsFromJSON() {
        const jsonText = this.jsonLyricsInput.value.trim();
        
        if (!jsonText) {
            this.showToastNotification('warning', 'Input Required', 'Please paste your JSON lyrics first.');
            return;
        }
        
        try {
            const lyricsData = JSON.parse(jsonText);
            
            // Validate JSON structure
            this.validateLyricsData(lyricsData);
            
            // Clear existing lyrics and import new ones
            this.lyricsManager.clearLyricsContainer();
            this.lyricsManager.importLyricsItems(lyricsData);
            
            this.lyricsManager.updateLyricsData();
            this.closeModal();
            
            this.showToastNotification('success', 'Import Successful', `Successfully imported ${lyricsData.length} lyrics items!`);
            
        } catch (error) {
            this.showToastNotification('error', 'Import Failed', 'Error parsing JSON: ' + error.message);
        }
    }

    /**
     * Validate lyrics data structure
     * @param {Array} lyricsData - Array of lyrics objects to validate
     */
    validateLyricsData(lyricsData) {
        if (!Array.isArray(lyricsData)) {
            throw new Error('JSON must be an array of objects');
        }
        
        const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
        
        lyricsData.forEach((item, index) => {
            if (typeof item !== 'object' || item === null) {
                throw new Error(`Item at index ${index} must be an object`);
            }
            
            if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
                throw new Error(`Item at index ${index} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
            }
            
            if (!timeRegex.test(item.start) || !timeRegex.test(item.end)) {
                throw new Error(`Item at index ${index} has invalid time format. Use mm:ss format (e.g., "01:30")`);
            }
            
            const startSeconds = this.lyricsManager.timeToSeconds(item.start);
            const endSeconds = this.lyricsManager.timeToSeconds(item.end);
            
            if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                throw new Error(`Item at index ${index} has invalid time values: start must be >= 00:00, end must be > start`);
            }
        });
    }
    
    /**
     * Show toast notification
     * @param {string} type - Type of notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    showToastNotification(type, title, message) {
        if (window.toastSystem) {
            window.toastSystem.showToast(type, title, message);
        } else {
            // Fallback to alert if toast system is not available
            alert(`${title}: ${message}`);
        }
    }
}
