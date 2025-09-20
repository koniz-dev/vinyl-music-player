/**
 * File Utilities
 * Handles file operations, validation, and processing
 */
class FileUtils {
    /**
     * Validate file type
     * @param {File} file - File object
     * @param {Array<string>} allowedTypes - Allowed MIME types
     * @returns {Object} Validation result
     */
    static validateFileType(file, allowedTypes) {
        const result = {
            isValid: true,
            error: null
        };
        
        if (!file) {
            result.isValid = false;
            result.error = 'No file provided';
            return result;
        }
        
        // Check MIME type first
        if (allowedTypes.includes(file.type)) {
            return result;
        }
        
        // Fallback: Check file extension for audio files
        const fileName = file.name.toLowerCase();
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.mp4', '.aac', '.flac', '.m4a'];
        const hasValidExtension = audioExtensions.some(ext => fileName.endsWith(ext));
        
        if (hasValidExtension) {
            return result;
        }
        
        result.isValid = false;
        result.error = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
        return result;
    }
    
    /**
     * Validate file size
     * @param {File} file - File object
     * @param {number} maxSizeMB - Maximum size in MB
     * @returns {Object} Validation result
     */
    static validateFileSize(file, maxSizeMB) {
        const result = {
            isValid: true,
            error: null
        };
        
        if (!file) {
            result.isValid = false;
            result.error = 'No file provided';
            return result;
        }
        
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            result.isValid = false;
            result.error = `File too large. Maximum size: ${maxSizeMB}MB`;
            return result;
        }
        
        return result;
    }
    
    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get file extension
     * @param {string} filename - File name
     * @returns {string} File extension
     */
    static getFileExtension(filename) {
        if (!filename) return '';
        return filename.split('.').pop().toLowerCase();
    }
    
    /**
     * Sanitize filename for safe usage
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        if (!filename) return 'untitled';
        
        // Remove invalid characters
        return filename.replace(/[<>:"/\\|?*]/g, '').trim();
    }
    
    /**
     * Create object URL for file
     * @param {File} file - File object
     * @returns {string} Object URL
     */
    static createObjectURL(file) {
        if (!file) return null;
        return URL.createObjectURL(file);
    }
    
    /**
     * Revoke object URL
     * @param {string} url - Object URL to revoke
     */
    static revokeObjectURL(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
    
    /**
     * Download file from blob
     * @param {Blob} blob - File blob
     * @param {string} filename - Download filename
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Read file as text
     * @param {File} file - File object
     * @returns {Promise<string>} File content as text
     */
    static readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    /**
     * Read file as data URL
     * @param {File} file - File object
     * @returns {Promise<string>} File content as data URL
     */
    static readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Validate audio file
     * @param {File} file - Audio file
     * @returns {Object} Validation result
     */
    static validateAudioFile(file) {
        const allowedTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/aac',
            'audio/flac',
            'audio/m4a',
            'audio/x-m4a',
            'audio/mp4a-latm'
        ];
        
        const typeValidation = this.validateFileType(file, allowedTypes);
        if (!typeValidation.isValid) {
            return typeValidation;
        }
        
        const sizeValidation = this.validateFileSize(file, 100); // 100MB max
        if (!sizeValidation.isValid) {
            return sizeValidation;
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validate image file
     * @param {File} file - Image file
     * @returns {Object} Validation result
     */
    static validateImageFile(file) {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml'
        ];
        
        const typeValidation = this.validateFileType(file, allowedTypes);
        if (!typeValidation.isValid) {
            return typeValidation;
        }
        
        const sizeValidation = this.validateFileSize(file, 10); // 10MB max
        if (!sizeValidation.isValid) {
            return sizeValidation;
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Load image from file
     * @param {File} file - Image file
     * @returns {Promise<HTMLImageElement>} Loaded image element
     */
    static loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error('Failed to load image'));
            img.src = this.createObjectURL(file);
        });
    }
    
    /**
     * Create audio element from file
     * @param {File} file - Audio file
     * @returns {Promise<HTMLAudioElement>} Audio element
     */
    static createAudioFromFile(file) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => resolve(audio);
            audio.onerror = (e) => reject(new Error('Failed to load audio'));
            audio.src = this.createObjectURL(file);
        });
    }
    
    /**
     * Get file info object
     * @param {File} file - File object
     * @returns {Object} File information
     */
    static getFileInfo(file) {
        if (!file) return null;
        
        return {
            name: file.name,
            size: file.size,
            sizeFormatted: this.formatFileSize(file.size),
            type: file.type,
            extension: this.getFileExtension(file.name),
            lastModified: new Date(file.lastModified),
            sanitizedName: this.sanitizeFilename(file.name)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUtils;
}

window.FileUtils = FileUtils;
