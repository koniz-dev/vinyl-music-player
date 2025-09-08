'use client'

interface RecordArmProps {
  isPlaying: boolean
}

export function RecordArm({ isPlaying }: RecordArmProps) {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2">
      {/* Arm pivot point */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full z-10"></div>
      
      {/* Record arm */}
      <div className={`record-arm ${isPlaying ? 'animate-pulse' : ''}`}>
        <svg width="120" height="60" viewBox="0 0 120 60" className="text-white">
          {/* Arm body */}
          <path
            d="M20 20 Q60 10 100 30"
            stroke="white"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Needle/cartridge */}
          <rect
            x="95"
            y="25"
            width="8"
            height="12"
            fill="white"
            rx="1"
          />
          
          {/* Needle tip */}
          <path
            d="M99 37 L99 45 L97 45 Z"
            fill="white"
          />
        </svg>
      </div>
    </div>
  )
}
