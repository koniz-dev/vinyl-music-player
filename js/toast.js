
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

    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

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
        }, window.Constants?.UI.TOAST_SHOW_DELAY || 100);
        
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

    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }

    removeOldestToast() {
        const oldestToast = this.toastContainer.firstElementChild;
        if (oldestToast) {
            this.removeToast(oldestToast);
        }
    }

    showSuccess(title, message, duration = 4000) {
        return this.showToast('success', title, message, duration);
    }

    showError(title, message, duration = 5000) {
        return this.showToast('error', title, message, duration);
    }

    showInfo(title, message, duration = 4000) {
        return this.showToast('info', title, message, duration);
    }

    showWarning(title, message, duration = 4500) {
        return this.showToast('warning', title, message, duration);
    }

    clearAll() {
        const toasts = this.toastContainer.querySelectorAll('.toast');
        toasts.forEach(toast => this.removeToast(toast));
    }

    updateIcons(newIcons) {
        this.iconMap = { ...this.iconMap, ...newIcons };
    }
}

const toastManager = new ToastManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, toastManager };
}

window.toastManager = toastManager;
