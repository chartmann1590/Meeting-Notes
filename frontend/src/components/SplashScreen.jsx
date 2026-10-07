import React from 'react'

const SplashScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>
      
      {/* Animated Dots */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="text-center z-10">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-white bg-opacity-20 backdrop-blur-xs rounded-full flex items-center justify-center mx-auto mb-6 float">
            <span className="text-5xl">🎙️</span>
          </div>
          <h1 className="text-6xl font-bold text-white mb-4 gradient-text-animated">
            Meeting Notes
          </h1>
          <p className="text-xl text-white text-opacity-90 mb-8">
            AI-Powered Meeting Transcription & Analysis
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="bg-white bg-opacity-10 backdrop-blur-xs rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Real-time Transcription</h3>
            <p className="text-sm text-white text-opacity-80">Live speech-to-text conversion</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-xs rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold mb-1">Speaker Diarization</h3>
            <p className="text-sm text-white text-opacity-80">Identify and separate speakers</p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-xs rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold mb-1">AI Summaries</h3>
            <p className="text-sm text-white text-opacity-80">Intelligent meeting insights</p>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-8">
          <p className="text-white text-opacity-70 animate-pulse">
            Initializing your secure meeting environment...
          </p>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
