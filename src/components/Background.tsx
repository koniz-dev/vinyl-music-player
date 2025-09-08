'use client'

export function Background() {
  return (
    <div className="absolute inset-0">
      {/* Main background with person silhouette and city lights */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Person silhouette on the left */}
        <div className="absolute left-0 top-0 w-1/3 h-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-32 bg-gray-800 rounded-full opacity-60"></div>
          <div className="absolute left-8 top-1/2 -translate-y-1/2 w-12 h-24 bg-gray-700 rounded-full opacity-40"></div>
        </div>
        
        {/* City lights bokeh effect */}
        <div className="absolute inset-0 city-lights opacity-30"></div>
        
        {/* Additional blur overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      </div>
    </div>
  )
}
