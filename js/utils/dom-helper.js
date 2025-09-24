/**
 * DOM Helper Utility
 * Provides common DOM manipulation functions to reduce code duplication
 */
class DOMHelper {
    /**
     * Wait for DOM to be ready and execute callback
     */
    static waitForDOM(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
    
    /**
     * Get element by selector with error handling
     */
    static getElement(selector, context = document) {
        const element = context.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
        }
        return element;
    }
    
    /**
     * Get element by selector without warning
     */
    static getElementSilent(selector, context = document) {
        return context.querySelector(selector);
    }
    
    /**
     * Get multiple elements by selector
     */
    static getElements(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }
    
    /**
     * Add event listener with error handling
     */
    static addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Cannot add event listener: element is null');
            return;
        }
        
        element.addEventListener(event, handler, options);
    }
    
    /**
     * Remove event listener
     */
    static removeEventListener(element, event, handler, options = {}) {
        if (!element) return;
        element.removeEventListener(event, handler, options);
    }
    
    /**
     * Set element text content safely
     */
    static setTextContent(element, text) {
        if (!element) return;
        element.textContent = text || '';
    }
    
    /**
     * Set element innerHTML safely
     */
    static setInnerHTML(element, html) {
        if (!element) return;
        element.innerHTML = html || '';
    }
    
    /**
     * Set element style properties
     */
    static setStyles(element, styles) {
        if (!element || typeof styles !== 'object') return;
        
        Object.entries(styles).forEach(([property, value]) => {
            element.style[property] = value;
        });
    }
    
    /**
     * Toggle element class
     */
    static toggleClass(element, className, force) {
        if (!element) return;
        element.classList.toggle(className, force);
    }
    
    /**
     * Add class to element
     */
    static addClass(element, className) {
        if (!element) return;
        element.classList.add(className);
    }
    
    /**
     * Remove class from element
     */
    static removeClass(element, className) {
        if (!element) return;
        element.classList.remove(className);
    }
    
    /**
     * Check if element has class
     */
    static hasClass(element, className) {
        if (!element) return false;
        return element.classList.contains(className);
    }
    
    /**
     * Set element attribute
     */
    static setAttribute(element, name, value) {
        if (!element) return;
        element.setAttribute(name, value);
    }
    
    /**
     * Remove element attribute
     */
    static removeAttribute(element, name) {
        if (!element) return;
        element.removeAttribute(name);
    }
    
    /**
     * Get element attribute
     */
    static getAttribute(element, name) {
        if (!element) return null;
        return element.getAttribute(name);
    }
    
    /**
     * Show element
     */
    static show(element, display = 'block') {
        if (!element) return;
        element.style.display = display;
    }
    
    /**
     * Hide element
     */
    static hide(element) {
        if (!element) return;
        element.style.display = 'none';
    }
    
    /**
     * Enable/disable element
     */
    static setDisabled(element, disabled) {
        if (!element) return;
        element.disabled = disabled;
        element.style.opacity = disabled ? '0.5' : '1';
        element.style.cursor = disabled ? 'not-allowed' : 'pointer';
    }
    
    /**
     * Focus element with delay
     */
    static focusWithDelay(element, delay = 100) {
        if (!element) return;
        setTimeout(() => {
            element.focus();
        }, delay);
    }
    
    /**
     * Blur element
     */
    static blur(element) {
        if (!element) return;
        element.blur();
    }
    
    /**
     * Create element with attributes and content
     */
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([name, value]) => {
            if (name === 'className') {
                element.className = value;
            } else if (name === 'innerHTML') {
                element.innerHTML = value;
            } else if (name === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(name, value);
            }
        });
        
        // Set content
        if (content) {
            element.textContent = content;
        }
        
        return element;
    }
    
    /**
     * Append child to parent
     */
    static appendChild(parent, child) {
        if (!parent || !child) return;
        parent.appendChild(child);
    }
    
    /**
     * Remove child from parent
     */
    static removeChild(parent, child) {
        if (!parent || !child) return;
        parent.removeChild(child);
    }
    
    /**
     * Clear element content
     */
    static clear(element) {
        if (!element) return;
        element.innerHTML = '';
    }
    
    /**
     * Get computed style value
     */
    static getComputedStyle(element, property) {
        if (!element) return null;
        return getComputedStyle(element).getPropertyValue(property).trim();
    }
    
    /**
     * Set CSS custom property
     */
    static setCSSProperty(element, property, value) {
        if (!element) return;
        element.style.setProperty(property, value);
    }
    
    /**
     * Get CSS custom property
     */
    static getCSSProperty(element, property) {
        if (!element) return null;
        return getComputedStyle(element).getPropertyValue(property).trim();
    }
    
    /**
     * Setup drag and drop handlers
     */
    static setupDragAndDrop(element, handlers) {
        if (!element) return;
        
        const { onDragOver, onDragLeave, onDrop } = handlers;
        
        if (onDragOver) {
            element.addEventListener('dragover', (e) => {
                e.preventDefault();
                onDragOver(e);
            });
        }
        
        if (onDragLeave) {
            element.addEventListener('dragleave', (e) => {
                e.preventDefault();
                onDragLeave(e);
            });
        }
        
        if (onDrop) {
            element.addEventListener('drop', (e) => {
                e.preventDefault();
                onDrop(e);
            });
        }
    }
    
    /**
     * Setup file input handler
     */
    static setupFileInput(input, handler) {
        if (!input || !handler) return;
        
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handler(e.target.files[0]);
            }
        });
    }
    
    /**
     * Setup form input with debouncing
     */
    static setupFormInput(input, handler, debounceMs = 200) {
        if (!input || !handler) return;
        
        let timeoutId;
        
        const debouncedHandler = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handler, debounceMs);
        };
        
        input.addEventListener('input', debouncedHandler);
        input.addEventListener('change', debouncedHandler);
        input.addEventListener('keyup', debouncedHandler);
        input.addEventListener('paste', () => {
            setTimeout(debouncedHandler, 10);
        });
    }
    
    /**
     * Setup modal handlers
     */
    static setupModal(modal, options = {}) {
        if (!modal) return;
        
        const {
            openBtn,
            closeBtn,
            cancelBtn,
            onOpen,
            onClose,
            onCancel,
            trapFocus = true
        } = options;
        
        // Open modal
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.openModal(modal, onOpen);
            });
        }
        
        // Close modal
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal, onClose);
            });
        }
        
        // Cancel modal
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modal, onCancel);
            });
        }
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal, onClose);
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                this.closeModal(modal, onClose);
            }
        });
        
        // Focus trapping
        if (trapFocus) {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, modal);
                }
            });
        }
    }
    
    /**
     * Open modal
     */
    static openModal(modal, onOpen) {
        modal.setAttribute('aria-hidden', 'false');
        modal.removeAttribute('inert');
        modal.style.display = 'flex';
        
        if (onOpen) {
            onOpen();
        }
    }
    
    /**
     * Close modal
     */
    static closeModal(modal, onClose) {
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
        modal.style.display = 'none';
        
        if (onClose) {
            onClose();
        }
    }
    
    /**
     * Trap focus within modal
     */
    static trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMHelper;
}

window.DOMHelper = DOMHelper;
