class FileUtils {
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
    
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    static getFileExtension(filename) {
        if (!filename) return '';
        return filename.split('.').pop().toLowerCase();
    }
    
    static sanitizeFilename(filename) {
        if (!filename) return 'untitled';
        
        // Remove invalid characters
        return filename.replace(/[<>:"/\\|?*]/g, '').trim();
    }
    
    static createObjectURL(file) {
        if (!file) return null;
        return URL.createObjectURL(file);
    }
    
    static revokeObjectURL(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
    
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
    
    static readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    static readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
    
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
    
    static loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error('Failed to load image'));
            img.src = this.createObjectURL(file);
        });
    }
    
    static createAudioFromFile(file) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => resolve(audio);
            audio.onerror = (e) => reject(new Error('Failed to load audio'));
            audio.src = this.createObjectURL(file);
        });
    }
    
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUtils;
}

window.FileUtils = FileUtils;
