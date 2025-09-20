/**
 * Toast Notification System
 * Provides a modern, accessible toast notification system similar to json-formatter
 */

class ToastManager {
    constructor() {
        this.toastContainer = document.getElementById('toast-container');
        this.toastQueue = [];
        this.maxToasts = 5;
        
        this.iconMap = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        if (!this.toastContainer) {
            this.createToastContainer();
        }
    }

    /**
     * Create toast container if it doesn't exist
     */
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    /**
     * Show a toast notification
     * @param {string} type - Type of toast (success, error, info, warning)
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds (default: 4000)
     */
    showToast(type, title, message, duration = 4000) {
        if (this.toastContainer.children.length >= this.maxToasts) {
            this.removeOldestToast();
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <span class="toast-icon">${this.iconMap[type] || this.iconMap.info}</span>
            <div class="toast-content">
                <h4 class="toast-title">${title}</h4>
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">
                <span><i class="fas fa-times"></i></span>
            </button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);

        toast.addEventListener('click', (e) => {
            if (e.target.classList.contains('toast-close') || e.target.closest('.toast-close')) {
                this.removeToast(toast);
            }
        });

        return toast;
    }

    /**
     * Remove a specific toast
     * @param {HTMLElement} toast - Toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }

    /**
     * Remove the oldest toast
     */
    removeOldestToast() {
        const oldestToast = this.toastContainer.firstElementChild;
        if (oldestToast) {
            this.removeToast(oldestToast);
        }
    }

    /**
     * Show success toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showSuccess(title, message, duration = 4000) {
        return this.showToast('success', title, message, duration);
    }

    /**
     * Show error toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showError(title, message, duration = 5000) {
        return this.showToast('error', title, message, duration);
    }

    /**
     * Show info toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showInfo(title, message, duration = 4000) {
        return this.showToast('info', title, message, duration);
    }

    /**
     * Show warning toast
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    showWarning(title, message, duration = 4500) {
        return this.showToast('warning', title, message, duration);
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => this.removeToast(toast));
    }

    /**
     * Update toast icon mapping
     * @param {Object} newIcons - New icon mapping
     */
    updateIcons(newIcons) {
        this.iconMap = { ...this.iconMap, ...newIcons };
    }
}

const toastManager = new ToastManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, toastManager };
}

window.toastManager = toastManager;
