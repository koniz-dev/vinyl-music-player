'use client'

interface ProgressBarProps {
  currentTime: number
  totalTime: number
  formatTime: (seconds: number) => string
}

export function ProgressBar({ currentTime, totalTime, formatTime }: ProgressBarProps) {
  const progress = (currentTime / totalTime) * 100

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="relative">
        <div className="w-full h-1 bg-white/20 rounded-full">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Scrubber */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
          style={{ left: `calc(${progress}% - 6px)` }}
        ></div>
      </div>
      
      {/* Time display */}
      <div className="flex justify-between text-white text-sm">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(totalTime)}</span>
      </div>
    </div>
  )
}
