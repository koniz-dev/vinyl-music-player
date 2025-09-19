// Toast Notification System for Vinyl Music Player
class ToastSystem {
    constructor() {
        this.toastContainer = document.getElementById('toast-container');
        this.init();
    }

    init() {
        // Ensure toast container exists
        if (!this.toastContainer) {
            console.error('Toast container not found!');
            return;
        }
    }

    showToast(type, title, message, duration = 4000) {
        if (!this.toastContainer) {
            console.error('Toast container not found!');
            return;
        }

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
        
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    showSuccess(title, message, duration) {
        this.showToast('success', title, message, duration);
    }

    showError(title, message, duration) {
        this.showToast('error', title, message, duration);
    }

    showInfo(title, message, duration) {
        this.showToast('info', title, message, duration);
    }

    showWarning(title, message, duration) {
        this.showToast('warning', title, message, duration);
    }
}

// Create global toast instance
let toastSystem;

// Initialize toast system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    toastSystem = new ToastSystem();
});

// Global functions for easy access
function showToast(type, title, message, duration) {
    if (toastSystem) {
        toastSystem.showToast(type, title, message, duration);
    }
}

function showSuccess(title, message, duration) {
    if (toastSystem) {
        toastSystem.showSuccess(title, message, duration);
    }
}

function showError(title, message, duration) {
    if (toastSystem) {
        toastSystem.showError(title, message, duration);
    }
}

function showInfo(title, message, duration) {
    if (toastSystem) {
        toastSystem.showInfo(title, message, duration);
    }
}

function showWarning(title, message, duration) {
    if (toastSystem) {
        toastSystem.showWarning(title, message, duration);
    }
}
