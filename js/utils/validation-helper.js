/**
 * Validation Helper Utility
 * Provides common validation functions to reduce code duplication
 */
class ValidationHelper {
    /**
     * Validate file type
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
     * Validate audio file
     */
    static validateAudioFile(file) {
        const allowedTypes = window.Constants?.AUDIO?.SUPPORTED_FORMATS || [
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
        
        const maxSizeMB = window.Constants?.EXPORT?.MAX_FILE_SIZE_MB || 100;
        const sizeValidation = this.validateFileSize(file, maxSizeMB);
        if (!sizeValidation.isValid) {
            return sizeValidation;
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validate image file
     */
    static validateImageFile(file) {
        const allowedTypes = window.Constants?.IMAGE?.SUPPORTED_FORMATS || [
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
        
        const maxSizeMB = window.Constants?.EXPORT?.MAX_IMAGE_SIZE_MB || 10;
        const sizeValidation = this.validateFileSize(file, maxSizeMB);
        if (!sizeValidation.isValid) {
            return sizeValidation;
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validate time format (mm:ss)
     */
    static isValidTimeFormat(timeString) {
        if (!timeString || typeof timeString !== 'string') return false;
        
        const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
        return timeRegex.test(timeString);
    }
    
    /**
     * Validate time range
     */
    static validateTimeRange(startTime, endTime) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!this.isValidTimeFormat(startTime)) {
            result.isValid = false;
            result.errors.push('Invalid start time format. Use mm:ss format.');
        }
        
        if (!this.isValidTimeFormat(endTime)) {
            result.isValid = false;
            result.errors.push('Invalid end time format. Use mm:ss format.');
        }
        
        if (result.isValid) {
            const startSeconds = window.TimeUtils?.timeToSeconds(startTime) || 0;
            const endSeconds = window.TimeUtils?.timeToSeconds(endTime) || 0;
            
            if (startSeconds < 0) {
                result.isValid = false;
                result.errors.push('Start time must be >= 00:00');
            }
            
            if (endSeconds < 0) {
                result.isValid = false;
                result.errors.push('End time must be >= 00:00');
            }
            
            if (startSeconds >= endSeconds) {
                result.isValid = false;
                result.errors.push('End time must be greater than start time');
            }
        }
        
        return result;
    }
    
    /**
     * Validate lyrics data
     */
    static validateLyricsData(lyricsData) {
        const result = {
            isValid: true,
            errors: []
        };
        
        if (!Array.isArray(lyricsData)) {
            result.isValid = false;
            result.errors.push('JSON must be an array of objects');
            return result;
        }
        
        for (let i = 0; i < lyricsData.length; i++) {
            const item = lyricsData[i];
            
            if (typeof item !== 'object' || item === null) {
                result.isValid = false;
                result.errors.push(`Item at index ${i} must be an object`);
                continue;
            }
            
            if (typeof item.start !== 'string' || typeof item.end !== 'string' || typeof item.text !== 'string') {
                result.isValid = false;
                result.errors.push(`Item at index ${i} must have 'start' (mm:ss), 'end' (mm:ss), and 'text' (string) properties`);
                continue;
            }
            
            const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
            if (!timeRegex.test(item.start) || !timeRegex.test(item.end)) {
                result.isValid = false;
                result.errors.push(`Item at index ${i} has invalid time format. Use mm:ss format (e.g., "01:30")`);
                continue;
            }
            
            const startSeconds = window.TimeUtils?.timeToSeconds(item.start) || 0;
            const endSeconds = window.TimeUtils?.timeToSeconds(item.end) || 0;
            
            if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                result.isValid = false;
                result.errors.push(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
            }
        }
        
        return result;
    }
    
    /**
     * Validate required fields
     */
    static validateRequiredFields(data, requiredFields) {
        const result = {
            isValid: true,
            errors: []
        };
        
        for (const field of requiredFields) {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                result.isValid = false;
                result.errors.push(`${field} is required`);
            }
        }
        
        return result;
    }
    
    /**
     * Validate email format
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate URL format
     */
    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Validate number range
     */
    static validateNumberRange(value, min, max) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    }
    
    /**
     * Validate string length
     */
    static validateStringLength(str, minLength, maxLength) {
        if (typeof str !== 'string') return false;
        return str.length >= minLength && str.length <= maxLength;
    }
    
    /**
     * Sanitize filename
     */
    static sanitizeFilename(filename) {
        if (!filename) return 'untitled';
        
        // Remove invalid characters
        return filename.replace(/[<>:"/\\|?*]/g, '').trim();
    }
    
    /**
     * Validate JSON string
     */
    static validateJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return { isValid: true, error: null };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }
    
    /**
     * Validate browser support
     */
    static validateBrowserSupport() {
        const support = {
            mediaRecorder: !!window.MediaRecorder,
            canvas: !!document.createElement('canvas').getContext,
            audio: !!window.Audio,
            webm: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/webm') : false,
            webm_vp8: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/webm;codecs=vp8') : false,
            webm_vp9: window.MediaRecorder ? MediaRecorder.isTypeSupported('video/webm;codecs=vp9') : false,
            userAgent: navigator.userAgent
        };
        
        return support;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationHelper;
}

window.ValidationHelper = ValidationHelper;
