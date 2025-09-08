'use client'

import { AlbumArt } from './AlbumArt'
import { RecordArm } from './RecordArm'

interface VinylRecordProps {
  isPlaying: boolean
}

export function VinylRecord({ isPlaying }: VinylRecordProps) {
  return (
    <div className="relative">
      {/* Vinyl record */}
      <div className={`relative w-80 h-80 rounded-full vinyl-record vinyl-grooves ${
        isPlaying ? 'animate-spin-slow' : ''
      }`}>
        {/* Center hole */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full border-2 border-gray-600"></div>
        
        {/* Album art in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full overflow-hidden">
          <AlbumArt />
        </div>
      </div>
      
      {/* Record player arm */}
      <RecordArm isPlaying={isPlaying} />
    </div>
  )
}
