'use client'

interface MusicControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
}

export function MusicControls({ isPlaying, onPlayPause }: MusicControlsProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Download button */}
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
      
      {/* Previous track */}
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="19,20 9,12 19,4 19,20"/>
          <line x1="5" y1="19" x2="5" y2="5"/>
        </svg>
      </button>
      
      {/* Play/Pause button */}
      <button 
        onClick={onPlayPause}
        className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg"
      >
        {isPlaying ? (
          // Pause icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          // Play icon
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21 5,3"/>
          </svg>
        )}
      </button>
      
      {/* Next track */}
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5,4 15,12 5,20 5,4"/>
          <line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </button>
      
      {/* More options */}
      <button className="text-white hover:text-gray-300 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1"/>
          <circle cx="19" cy="12" r="1"/>
          <circle cx="5" cy="12" r="1"/>
        </svg>
      </button>
    </div>
  )
}
