'use client'

export function AlbumArt() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-gray-800 to-black">
      {/* Background city lights (similar to main background but different focus) */}
      <div className="absolute inset-0 city-lights opacity-20"></div>
      
      {/* Hands holding broken heart */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Hands */}
        <div className="relative">
          {/* Left hand */}
          <div className="absolute -left-8 -top-2 w-12 h-16 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full transform -rotate-12 opacity-80"></div>
          
          {/* Right hand */}
          <div className="absolute -right-8 -top-2 w-12 h-16 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full transform rotate-12 opacity-80"></div>
          
          {/* Broken heart */}
          <div className="relative w-16 h-16">
            {/* Heart shape */}
            <div className="absolute inset-0 heart-glow">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M50 85 C50 85, 20 60, 20 40 C20 25, 35 25, 50 40 C65 25, 80 25, 80 40 C80 60, 50 85, 50 85 Z"
                  fill="rgba(255, 255, 255, 0.9)"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="1"
                />
                {/* Crack in the heart */}
                <path
                  d="M50 25 L50 85 M35 40 L65 60"
                  stroke="rgba(255, 255, 255, 1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Glow effect from crack */}
                <path
                  d="M50 25 L50 85 M35 40 L65 60"
                  stroke="rgba(255, 255, 255, 0.8)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-pulse-glow"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
