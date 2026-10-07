import React, { useState, useRef, useEffect } from 'react'

const RecordingInterface = ({ sessionId, onTranscriptUpdate }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  // Initialize audio devices on component mount
  useEffect(() => {
    getAudioDevices()
    return () => {
      cleanup()
    }
  }, [])

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  // Get available audio devices
  const getAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      setAudioDevices(audioInputs)
      if (audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId)
      }
    } catch (err) {
      console.error('Error getting audio devices:', err)
      setError('Failed to access audio devices')
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError('')
      
      // Request microphone access
      const constraints = {
        audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      // Set up audio analysis for waveform
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      source.connect(analyser)
      analyser.fftSize = 256
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start recording
      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      setIsPaused(false)

      // Start timer
      setRecordingTime(0)
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Start audio level monitoring
      monitorAudioLevel()

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send audio chunk to backend for transcription
          sendAudioChunk(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('Recording stopped')
      }

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording. Please check microphone permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      cleanup()
    }
  }

  // Pause/Resume recording
  const togglePause = () => {
    if (isPaused) {
      // Resume recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
        
        // Resume timer
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
        
        // Resume audio monitoring
        monitorAudioLevel()
      }
    } else {
      // Pause recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
        
        // Pause timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        
        // Pause audio monitoring
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }

  // Monitor audio level for waveform visualization
  const monitorAudioLevel = () => {
    const monitor = () => {
      if (analyserRef.current && isRecording && !isPaused) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate average audio level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        setAudioLevel(average)
        
        animationFrameRef.current = requestAnimationFrame(monitor)
      }
    }
    monitor()
  }

  // Send audio chunk to backend
  const sendAudioChunk = async (audioBlob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      formData.append('session_id', sessionId)
      formData.append('timestamp', Date.now())

      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.transcript) {
          setTranscript(prev => prev + ' ' + result.transcript)
          if (onTranscriptUpdate) {
            onTranscriptUpdate(result.transcript)
          }
        }
      } else {
        console.error('Transcription failed:', response.statusText)
      }
    } catch (err) {
      console.error('Error sending audio chunk:', err)
    }
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-screen bg-[#18181B] text-[#f4f4f5]">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#3f3f46] shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{fontFamily: 'Noto Sans, sans-serif'}}>Meeting Notes</h1>
          <div className="w-px h-6 bg-[#3f3f46]"></div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">Q3 Strategy Session</span>
            <span className="text-sm text-[#a1a1aa] font-mono">{formatTime(recordingTime)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={stopRecording}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <span className="material-symbols-outlined">stop_circle</span>
            Stop Recording
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex flex-col w-64 p-6 border-r border-[#3f3f46] bg-[#27272A]">
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider" style={{fontFamily: 'Noto Sans, sans-serif'}}>Transport</h2>
              <div className="flex items-center gap-2">
                <button className="flex-1 p-2 bg-[#18181B] rounded-md hover:bg-opacity-80 flex items-center justify-center">
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
                <button 
                  onClick={togglePause}
                  className="flex-1 p-2 bg-[#18181B] rounded-md hover:bg-opacity-80 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">pause</span>
                </button>
                <button 
                  onClick={stopRecording}
                  className="flex-1 p-2 bg-[#18181B] rounded-md hover:bg-opacity-80 flex items-center justify-center text-red-500"
                >
                  <span className="material-symbols-outlined">stop</span>
                </button>
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider" style={{fontFamily: 'Noto Sans, sans-serif'}}>Input Device</h2>
              <select 
                className="w-full p-2 text-white bg-[#18181B] border border-[#3f3f46] rounded-md focus:ring-2 focus:ring-[#4f46e5]"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={isRecording}
              >
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider" style={{fontFamily: 'Noto Sans, sans-serif'}}>Input Level</h2>
              <div className="w-full h-4 bg-[#18181B] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500" 
                  style={{width: `${(audioLevel / 255) * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="h-32 mb-6 bg-[#27272A] rounded-md flex items-center justify-center">
            <p className="text-[#a1a1aa]">[Waveform Visualization]</p>
          </div>
          <div className="flex-1 p-4 mb-6 space-y-4 overflow-y-auto bg-[#27272A] rounded-md" style={{fontFamily: 'Noto Sans, sans-serif'}}>
            {transcript ? (
              <div className="flex gap-4">
                <span className="font-mono text-sm text-[#a1a1aa]">{formatTime(recordingTime)}</span>
                <p className="text-[#f4f4f5]"><strong className="text-cyan-400">[S1]:</strong> {transcript}</p>
              </div>
            ) : (
              <div className="text-center text-[#a1a1aa] py-8">
                <p>Start recording to see live transcript here...</p>
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold" style={{fontFamily: 'Noto Sans, sans-serif'}}>Speaker Timeline</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-sm font-medium text-cyan-400">Speaker 1</span>
                <div className="h-8 bg-[#27272A] rounded-md relative">
                  <div className="absolute h-full bg-cyan-400 rounded-md" style={{left: '10%', width: '30%'}}></div>
                  <div className="absolute h-full bg-cyan-400 rounded-md" style={{left: '50%', width: '40%'}}></div>
                </div>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-sm font-medium text-amber-400">Speaker 2</span>
                <div className="h-8 bg-[#27272A] rounded-md relative">
                  <div className="absolute h-full bg-amber-400 rounded-md" style={{left: '42%', width: '8%'}}></div>
                </div>
              </div>
              <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                <span className="text-sm font-medium text-fuchsia-400">Speaker 3</span>
                <div className="h-8 bg-[#27272A] rounded-md"></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-[#27272A] rounded-md hover:bg-opacity-80">
                <span className="material-symbols-outlined text-base">content_cut</span> Split
              </button>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-[#27272A] rounded-md hover:bg-opacity-80">
                <span className="material-symbols-outlined text-base">merge_type</span> Merge
              </button>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-[#27272A] rounded-md hover:bg-opacity-80">
                <span className="material-symbols-outlined text-base">person</span> Reassign
              </button>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-[#27272A] rounded-md hover:bg-opacity-80">
                <span className="material-symbols-outlined text-base">edit</span> Rename
              </button>
            </div>
          </div>
        </main>
        <aside className="flex flex-col w-80 p-6 border-l border-[#3f3f46] bg-[#27272A] overflow-y-auto">
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider" style={{fontFamily: 'Noto Sans, sans-serif'}}>Quick Notes</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 text-xs font-medium bg-blue-900/50 text-blue-300 rounded-full cursor-pointer">Action Item</span>
              <span className="px-2 py-1 text-xs font-medium bg-purple-900/50 text-purple-300 rounded-full cursor-pointer">Decision</span>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded-full cursor-pointer">Question</span>
            </div>
            <textarea 
              className="w-full p-2 text-sm bg-[#18181B] border border-[#3f3f46] rounded-md resize-none h-24 focus:ring-2 focus:ring-[#4f46e5]" 
              placeholder="Add a quick note..."
              style={{fontFamily: 'Noto Sans, sans-serif'}}
            ></textarea>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#a1a1aa] uppercase tracking-wider" style={{fontFamily: 'Noto Sans, sans-serif'}}>Markers</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-1 font-mono text-xs text-[#a1a1aa]">15:32</span>
                <p className="text-sm">Final decision on the marketing budget.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 font-mono text-xs text-[#a1a1aa]">28:10</span>
                <p className="text-sm">Action Item: Sarah to follow up with the design team.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <div className="absolute bottom-0 right-0 p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-4 p-4 bg-yellow-900/80 backdrop-blur-xs text-yellow-200 border border-yellow-700 rounded-lg max-w-sm">
            <span className="material-symbols-outlined">mic_off</span>
            <p className="text-sm">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-4 p-4 bg-green-900/80 backdrop-blur-xs text-green-200 border border-green-700 rounded-lg max-w-sm">
          <span className="material-symbols-outlined">save</span>
          <p className="text-sm">Notes auto-saved successfully.</p>
        </div>
      </div>
    </div>
  )
}

export default RecordingInterface
