/**
 * Lyrics Management Module
 * Handles adding, removing, and managing lyrics items
 */
export class LyricsManager {
    constructor() {
        this.lyricsCount = 0;
        this.initializeElements();
        this.setupEventListeners();
        // Initialize with one lyrics item (without notification)
        this.addLyricsItem(false);
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.lyricsContainer = document.getElementById('lyrics-container');
        this.addLyricsBtn = document.getElementById('add-lyrics-btn');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.addLyricsBtn.addEventListener('click', () => this.addLyricsItem());
    }
    
    /**
     * Add a new lyrics item to the container
     * @param {boolean} showNotification - Whether to show success notification (default: true)
     */
    addLyricsItem(showNotification = true) {
        this.lyricsCount++;
        const lyricsItem = document.createElement('div');
        lyricsItem.className = 'lyrics-item';
        lyricsItem.innerHTML = `
            <div class="lyrics-item-header">
                <div class="lyrics-item-title">Lyrics ${this.lyricsCount}</div>
                <button type="button" class="remove-lyrics-btn" data-action="remove">×</button>
            </div>
            <div class="lyrics-inputs">
                <div>
                    <div class="time-label">Start Time (mm:ss)</div>
                    <input type="text" class="time-input" placeholder="00:00" pattern="[0-9]{1,2}:[0-9]{2}" data-action="update">
                </div>
                <div>
                    <div class="time-label">End Time (mm:ss)</div>
                    <input type="text" class="time-input" placeholder="00:05" pattern="[0-9]{1,2}:[0-9]{2}" data-action="update">
                </div>
                <div>
                    <div class="lyrics-label">Lyrics Content</div>
                    <input type="text" class="lyrics-text-input" placeholder="Enter lyrics..." data-action="update">
                </div>
            </div>
        `;
        
        // Add event listeners to the new item
        this.setupLyricsItemListeners(lyricsItem);
        
        this.lyricsContainer.appendChild(lyricsItem);
        
        // Show success notification only if requested
        if (showNotification) {
            this.showToastNotification('success', 'Lyrics Added', `Lyrics item ${this.lyricsCount} has been added successfully!`);
        }
    }
    
    /**
     * Setup event listeners for a lyrics item
     * @param {HTMLElement} lyricsItem - The lyrics item element
     */
    setupLyricsItemListeners(lyricsItem) {
        // Remove button
        const removeBtn = lyricsItem.querySelector('[data-action="remove"]');
        removeBtn.addEventListener('click', () => this.removeLyricsItem(removeBtn));
        
        // Update inputs
        const updateInputs = lyricsItem.querySelectorAll('[data-action="update"]');
        updateInputs.forEach(input => {
            input.addEventListener('input', () => this.updateLyricsData());
        });
    }

    /**
     * Remove a lyrics item from the container
     * @param {HTMLElement} button - The remove button element
     */
    removeLyricsItem(button) {
        const lyricsItem = button.closest('.lyrics-item');
        const lyricsTitle = lyricsItem.querySelector('.lyrics-item-title').textContent;
        lyricsItem.remove();
        this.updateLyricsData();
        
        // Show info notification
        this.showToastNotification('info', 'Lyrics Removed', `${lyricsTitle} has been removed successfully!`);
    }

    /**
     * Convert time string (mm:ss) to seconds
     * @param {string} timeString - Time in format "mm:ss"
     * @returns {number} Time in seconds
     */
    timeToSeconds(timeString) {
        if (!timeString || timeString === '') return 0;
        
        const parts = timeString.split(':');
        if (parts.length !== 2) return 0;
        
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        
        return minutes * 60 + seconds;
    }

    /**
     * Update lyrics data from all lyrics items and send to player
     */
    updateLyricsData() {
        const lyricsItems = this.lyricsContainer.querySelectorAll('.lyrics-item');
        const lyricsData = [];
        
        lyricsItems.forEach((item) => {
            const timeInputs = item.querySelectorAll('.time-input');
            const startTimeString = timeInputs[0]?.value || '00:00';
            const endTimeString = timeInputs[1]?.value || '';
            const text = item.querySelector('.lyrics-text-input')?.value.trim() || '';
            
            if (text) {
                const startTime = this.timeToSeconds(startTimeString);
                const endTime = endTimeString === '' ? startTime + 5 : this.timeToSeconds(endTimeString);
                
                lyricsData.push({
                    start: startTime,
                    end: endTime,
                    text: text
                });
            }
        });
        
        this.sendLyricsToPlayer(lyricsData);
    }

    /**
     * Send lyrics data to the music player
     * @param {Array} lyricsData - Array of lyrics objects
     */
    sendLyricsToPlayer(lyricsData) {
        window.postMessage({
            type: 'UPDATE_LYRICS',
            lyrics: lyricsData
        }, '*');
    }
    
    /**
     * Show toast notification
     * @param {string} type - Type of notification (success, error, info, warning)
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    showToastNotification(type, title, message) {
        if (window.toastSystem) {
            window.toastSystem.showToast(type, title, message);
        } else {
            // Fallback to alert if toast system is not available
            alert(`${title}: ${message}`);
        }
    }
    
    /**
     * Clear the lyrics container and reset counter
     */
    clearLyricsContainer() {
        this.lyricsContainer.innerHTML = '';
        this.lyricsCount = 0;
    }
    
    /**
     * Import lyrics items from validated data
     * @param {Array} lyricsData - Validated array of lyrics objects
     */
    importLyricsItems(lyricsData) {
        lyricsData.forEach((item) => {
            this.lyricsCount++;
            const lyricsItem = document.createElement('div');
            lyricsItem.className = 'lyrics-item';
            lyricsItem.innerHTML = `
                <div class="lyrics-item-header">
                    <div class="lyrics-item-title">Lyrics ${this.lyricsCount}</div>
                    <button type="button" class="remove-lyrics-btn" data-action="remove">×</button>
                </div>
                <div class="lyrics-inputs">
                    <div>
                        <div class="time-label">Start Time (mm:ss)</div>
                        <input type="text" class="time-input" placeholder="00:00" pattern="[0-9]{1,2}:[0-9]{2}" value="${item.start}" data-action="update">
                    </div>
                    <div>
                        <div class="time-label">End Time (mm:ss)</div>
                        <input type="text" class="time-input" placeholder="00:05" pattern="[0-9]{1,2}:[0-9]{2}" value="${item.end}" data-action="update">
                    </div>
                    <div>
                        <div class="lyrics-label">Lyrics Content</div>
                        <input type="text" class="lyrics-text-input" placeholder="Enter lyrics..." value="${item.text}" data-action="update">
                    </div>
                </div>
            `;
            
            // Add event listeners to the new item
            this.setupLyricsItemListeners(lyricsItem);
            
            this.lyricsContainer.appendChild(lyricsItem);
        });
    }
}
