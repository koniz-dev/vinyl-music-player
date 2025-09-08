'use client'

import { useState } from 'react'
import { Background } from './Background'
import { VinylRecord } from './VinylRecord'
import { MusicControls } from './MusicControls'
import { ProgressBar } from './ProgressBar'
import { TopControls } from './TopControls'

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(12) // 00:12
  const [totalTime] = useState(320) // 05:20
  const [songTitle] = useState('VÕ TAN')

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background with blur effect */}
      <Background />
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top controls */}
        <TopControls />
        
        {/* Main vinyl record area */}
        <div className="flex-1 flex items-center justify-center px-8">
          <VinylRecord isPlaying={isPlaying} />
        </div>
        
        {/* Song title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white tracking-wider">
            {songTitle}
          </h1>
        </div>
        
        {/* Progress bar */}
        <div className="px-8 mb-8">
          <ProgressBar 
            currentTime={currentTime}
            totalTime={totalTime}
            formatTime={formatTime}
          />
        </div>
        
        {/* Music controls */}
        <div className="px-8 pb-8">
          <MusicControls 
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />
        </div>
      </div>
    </div>
  )
}
