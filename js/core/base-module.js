/**
 * Base Module Class
 * Provides common functionality for all modules to reduce code duplication
 */
class BaseModule {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.isInitialized = false;
        this.eventListenersSetup = false;
        
        // Core systems - available to all modules
        this.appState = window.appState;
        this.eventBus = window.eventBus;
        this.logger = window.logger?.module(moduleName) || console;
        this.errorHandler = window.errorHandler;
        this.constants = window.Constants;
        
        // Don't auto-initialize - let the app control initialization
    }
    
    /**
     * Initialize the module
     * Override this method in subclasses for custom initialization
     */
    async initialize() {
        try {
            this.logger.debug(`Initializing ${this.moduleName}...`);
            
            // Setup DOM elements if needed
            this.initializeElements();
            
            // Setup event listeners (only if not already setup)
            if (!this.eventListenersSetup) {
                this.setupEventListeners();
                this.eventListenersSetup = true;
            }
            
            // Custom initialization
            await this.customInitialize();
            
            this.isInitialized = true;
            this.logger.debug(`${this.moduleName} initialized successfully`);
            
            this.eventBus.emit(`${this.moduleName.toLowerCase()}:initialized`);
            
        } catch (error) {
            this.errorHandler.handleError(`${this.moduleName} Initialization`, error);
            throw error;
        }
    }
    
    /**
     * Initialize DOM elements
     * Override this method in subclasses
     */
    initializeElements() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupElements();
            });
        } else {
            this.setupElements();
        }
    }
    
    /**
     * Setup DOM elements
     * Override this method in subclasses
     */
    setupElements() {
        // Override in subclasses
    }
    
    /**
     * Setup event listeners
     * Override this method in subclasses
     */
    setupEventListeners() {
        // Override in subclasses
    }
    
    /**
     * Custom initialization logic
     * Override this method in subclasses
     */
    async customInitialize() {
        // Override in subclasses
    }
    
    /**
     * Show success message
     */
    showSuccess(title, message) {
        if (window.toastManager) {
            window.toastManager.showSuccess(title, message);
        }
    }
    
    /**
     * Show error message
     */
    showError(title, message) {
        if (window.toastManager) {
            window.toastManager.showError(title, message);
        }
    }
    
    /**
     * Show warning message
     */
    showWarning(title, message) {
        if (window.toastManager) {
            window.toastManager.showWarning(title, message);
        }
    }
    
    /**
     * Show info message
     */
    showInfo(title, message) {
        if (window.toastManager) {
            window.toastManager.showInfo(title, message);
        }
    }
    
    /**
     * Destroy the module
     * Override this method in subclasses for custom cleanup
     */
    destroy() {
        this.logger.debug(`Destroying ${this.moduleName}`);
        
        // Custom cleanup
        this.customDestroy();
        
        this.isInitialized = false;
        this.eventBus.emit(`${this.moduleName.toLowerCase()}:destroyed`);
        
        this.logger.debug(`${this.moduleName} destroyed`);
    }
    
    /**
     * Custom destroy logic
     * Override this method in subclasses
     */
    customDestroy() {
        // Override in subclasses
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseModule;
}

window.BaseModule = BaseModule;
