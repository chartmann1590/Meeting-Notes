import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ProcessingScreen = ({ sessionId, onComplete }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [progress, setProgress] = useState(65)

  useEffect(() => {
    // Simulate processing steps
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          if (onComplete) {
            onComplete()
          }
          return 100
        }
        return prev + 5
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onComplete])

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_319)">
                <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_319"><rect fill="white" height="48" width="48"></rect></clipPath>
              </defs>
            </svg>
            <h1 className="font-serif text-xl font-bold text-slate-200" style={{fontFamily: 'Lora, serif'}}>Meeting Notes</h1>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => navigate('/')}
                className="text-sm font-medium text-slate-200 transition-colors hover:text-blue-500"
              >
                New Meeting
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className="text-sm font-medium text-slate-200 transition-colors hover:text-blue-500"
              >
                Library
              </button>
            </nav>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-slate-700">
              <span className="material-symbols-outlined text-slate-400">help</span>
            </button>
            <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAkbfNfaIo0wlKAFpPRXsFsy-1vHUEDLQy5rpvmCQXV4LeZGquXqGsOAtV-rMhUa4QikDH1Zavljcj49aVsuRgbePKmeDHPexY8hwXtxHfX_Pcm2u2W124fGR4Ya81pyu2VoR-KAatiKD1FIqKPlbeB-nrbCLRVhiBuOuGUpqZyg30gYT7IwVgKBulLgUXODOeHdYpgrLK2UaAV3diH9rNpZMTAMc_TA8cCkK7j_ff6mlo5DwyCC8qjF6UcfR5N3HIBS08owsIogxw")'}}></div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto flex h-full flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="font-serif text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl" style={{fontFamily: 'Lora, serif'}}>Finalizing your meeting</h2>
              <p className="mt-3 text-lg text-slate-400">Please wait while we process your recording. This may take a few minutes.</p>
            </div>
            <div className="space-y-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-medium text-slate-200" style={{fontFamily: 'Lora, serif'}}>Finalize Transcription</h3>
                  <span className="text-sm text-slate-400">Step 1 of 3</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div className="h-2 rounded-full bg-blue-500" style={{width: `${progress}%`}}></div>
                </div>
                <p className="text-sm text-slate-400">Estimated time: 5 minutes</p>
              </div>
              <div className={`space-y-4 ${currentStep >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-medium text-slate-200" style={{fontFamily: 'Lora, serif'}}>Diarization Tidy</h3>
                  <span className="text-sm text-slate-400">Step 2 of 3</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div className="h-2 rounded-full bg-blue-500" style={{width: currentStep >= 2 ? '100%' : '0%'}}></div>
                </div>
                <p className="text-sm text-slate-400">Estimated time: 2 minutes</p>
              </div>
              <div className={`space-y-4 ${currentStep >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-medium text-slate-200" style={{fontFamily: 'Lora, serif'}}>Summaries (LLM)</h3>
                  <span className="text-sm text-slate-400">Step 3 of 3</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div className="h-2 rounded-full bg-blue-500" style={{width: currentStep >= 3 ? '100%' : '0%'}}></div>
                </div>
                <p className="text-sm text-slate-400">Estimated time: 3 minutes</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button 
                onClick={() => navigate('/sessions')}
                className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600 sm:w-auto"
              >
                Cancel
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className="w-full rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto"
              >
                Back to Library
              </button>
            </div>
            <p className="mt-6 text-center text-sm text-slate-400">
              <button className="underline transition-colors hover:text-blue-500">
                Finalize in the background
              </button> if you need to navigate away.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProcessingScreen
