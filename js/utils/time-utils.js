class TimeUtils {
    static timeToSeconds(timeString) {
        if (!timeString || timeString === '') return 0;
        
        const parts = timeString.split(':');
        if (parts.length !== 2) return 0;
        
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        
        return minutes * 60 + seconds;
    }
    
    static secondsToTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    static formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    static isValidTimeFormat(timeString) {
        if (!timeString || typeof timeString !== 'string') return false;
        
        const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
        return timeRegex.test(timeString);
    }
    
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
            const startSeconds = this.timeToSeconds(startTime);
            const endSeconds = this.timeToSeconds(endTime);
            
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
    
    
    
    static calculateProgress(currentTime, totalTime) {
        if (!totalTime || totalTime <= 0) return 0;
        return Math.min((currentTime / totalTime) * 100, 100);
    }
    
    static timeFromProgress(progress, totalTime) {
        if (!totalTime || totalTime <= 0) return 0;
        return Math.floor((progress / 100) * totalTime);
    }
    
    static createTimeRange(startTime, endTime, text) {
        const validation = this.validateTimeRange(startTime, endTime);
        
        if (!validation.isValid) {
            throw new Error(`Invalid time range: ${validation.errors.join(', ')}`);
        }
        
        return {
            start: this.timeToSeconds(startTime),
            end: this.timeToSeconds(endTime),
            text: text || ''
        };
    }
    
    static findCurrentLyricIndex(lyrics, currentTime) {
        if (!lyrics || !Array.isArray(lyrics)) return -1;
        
        for (let i = 0; i < lyrics.length; i++) {
            const lyric = lyrics[i];
            if (lyric && 
                typeof lyric.start !== 'undefined' && 
                typeof lyric.end !== 'undefined' &&
                currentTime >= lyric.start && 
                currentTime < lyric.end) {
                return i;
            }
        }
        
        return -1;
    }
    
    static getCurrentLyric(lyrics, currentTime) {
        const index = this.findCurrentLyricIndex(lyrics, currentTime);
        return index >= 0 ? lyrics[index] : null;
    }
    
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
            
            const startSeconds = this.timeToSeconds(item.start);
            const endSeconds = this.timeToSeconds(item.end);
            
            if (startSeconds < 0 || endSeconds < 0 || startSeconds >= endSeconds) {
                result.isValid = false;
                result.errors.push(`Item at index ${i} has invalid time values: start must be >= 00:00, end must be > start`);
            }
        }
        
        return result;
    }
    
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeUtils;
}

window.TimeUtils = TimeUtils;
