/**
 * Toast Notification System for Vinyl Music Player
 * Provides a clean, modern notification system with different types and animations
 */
class ToastSystem {
    constructor() {
        this.toastContainer = document.getElementById('toast-container');
        this.init();
    }

    /**
     * Initialize the toast system
     */
    init() {
        // Ensure toast container exists
        if (!this.toastContainer) {
            console.error('Toast container not found!');
            return;
        }
    }

    /**
     * Show a toast notification
     * @param {string} type - Type of toast (success, error, info, warning)
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds (default: 4000)
     */
    showToast(type, title, message, duration = 4000) {
        if (!this.toastContainer) {
            console.error('Toast container not found!');
            return;
        }

        const toast = this.createToastElement(type, title, message);
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto remove
        this.scheduleToastRemoval(toast, duration);
    }

    /**
     * Create toast DOM element
     * @param {string} type - Toast type
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @returns {HTMLElement} The toast element
     */
    createToastElement(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${iconMap[type] || 'ℹ️'}</span>
            <div class="toast-content">
                <h4 class="toast-title">${title}</h4>
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                ×
            </button>
        `;
        
        return toast;
    }

    /**
     * Schedule toast removal with animation
     * @param {HTMLElement} toast - The toast element
     * @param {number} duration - Duration before removal
     */
    scheduleToastRemoval(toast, duration) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    /**
     * Show success toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showSuccess(title, message, duration) {
        this.showToast('success', title, message, duration);
    }

    /**
     * Show error toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showError(title, message, duration) {
        this.showToast('error', title, message, duration);
    }

    /**
     * Show info toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showInfo(title, message, duration) {
        this.showToast('info', title, message, duration);
    }

    /**
     * Show warning toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showWarning(title, message, duration) {
        this.showToast('warning', title, message, duration);
    }
}

/**
 * Global Toast System Instance and Functions
 */

// Create global toast instance
let toastSystem;

/**
 * Initialize toast system when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    window.toastSystem = new ToastSystem();
});

