import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const UploadRecording = () => {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [speakers, setSpeakers] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.type.startsWith('audio/')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select an audio file')
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile)
      setError('')
    } else {
      setError('Please drop an audio file')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('speakers', speakers)
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''))

      const token = localStorage.getItem('auth_token')
      const response = await axios.post(`${API_URL}/sessions/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })

      // Navigate to processing screen or session detail
      navigate(`/processing/${response.data.session_id}`)
    } catch (err) {
      setError('Upload failed. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex min-h-screen w-full flex-col bg-[#18181b]">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#3f3f46] bg-[#18181b]/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-[#4f46e5]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            <path d="M2 7L12 12L22 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            <path d="M12 22V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <h1 className="text-xl font-semibold text-[#f8f9fa]">Meeting Notes</h1>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <button 
            onClick={() => navigate('/')}
            className="text-sm font-medium text-[#a1a1aa] transition-colors hover:text-[#f8f9fa]"
          >
            New Meeting
          </button>
          <button 
            onClick={() => navigate('/sessions')}
            className="text-sm font-medium text-[#a1a1aa] transition-colors hover:text-[#f8f9fa]"
          >
            Past Meetings
          </button>
        </nav>
        <div className="flex items-center gap-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#27272a] text-[#a1a1aa] transition-colors hover:text-[#f8f9fa]">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-10 w-10 rounded-full bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA0-h_E38Q2Fc_Uk1g0hlTIv7z5PottcR_3FHbWPu8DOxEV6buBkDOrJASSASY3TquiEPTxVlgRRaN91_ZZUjFeQnA0BeWEUz0CzZTIl-E1jfRay6-2kgyvQC98B3gtT_YzrzYhs7K87YtbwroWWNbplRYFidD18B-qA1H_2rjk9ma0M5g8ATMPzS0URqg5IEy_mWsk5K9bdN8wztVXM9lhDYy47n-UBGv109yWy1X9uP1raz-9PwcEX2QMAi2YQT0c0qHYse9n5fA")'}}></div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#f4f2ed] text-[#312e2b]">
        <div className="w-full max-w-2xl rounded-lg border border-[#d6d3d1] bg-[#f4f2ed] p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#312e2b]">Upload Your Recording</h2>
            <p className="mt-2 text-[#78716c]">Drop your audio file below or select it from your device.</p>
          </div>
          <div className="mt-8">
            <label 
              className="relative block w-full cursor-pointer rounded-lg border-2 border-dashed border-[#d6d3d1] p-12 text-center transition-colors hover:border-[#4f46e5]" 
              htmlFor="file-upload"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <span className="material-symbols-outlined text-5xl text-[#78716c]">cloud_upload</span>
                <p className="text-lg font-semibold text-[#312e2b]">Drag & drop your file here</p>
                <p className="text-sm text-[#78716c]">or click to browse</p>
              </div>
              <input 
                accept="audio/*" 
                className="sr-only" 
                id="file-upload" 
                name="file-upload" 
                type="file"
                onChange={handleFileChange}
              />
            </label>
            <p className="mt-2 text-center text-xs text-[#78716c]">Audio only. Max 2 hours or 2 GB.</p>
            {file && (
              <div className="mt-4 p-4 bg-[#e7e5e4] rounded-lg">
                <p className="text-sm font-medium text-[#312e2b]">Selected: {file.name}</p>
                <p className="text-xs text-[#78716c]">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>
          <div className="mt-8">
            <label className="block text-sm font-medium text-[#312e2b]" htmlFor="speakers">Known Speakers (Optional)</label>
            <input 
              className="mt-1 block w-full rounded-md border-[#d6d3d1] bg-[#f4f2ed] px-3 py-2 text-[#312e2b] shadow-sm focus:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5] sm:text-sm" 
              id="speakers" 
              name="speakers" 
              placeholder="e.g., Alice, Bob, Charlie (comma-separated)" 
              type="text"
              value={speakers}
              onChange={(e) => setSpeakers(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#78716c]">Helps improve speaker identification accuracy.</p>
          </div>
          {uploading && (
            <div className="mt-8">
              <div className="rounded-lg border border-[#d6d3d1] bg-[#e7e5e4] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#312e2b]">{file?.name}</p>
                  <button 
                    onClick={() => setUploading(false)}
                    className="text-sm font-medium text-[#78716c] hover:text-[#312e2b]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-[#d6d3d1]">
                  <div className="h-2 rounded-full bg-[#4f46e5]" style={{width: `${uploadProgress}%`}}></div>
                </div>
                <p className="mt-2 text-xs text-[#78716c]">{uploadProgress}% uploaded</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center justify-center rounded-md bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4f46e5]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed" 
              type="button"
            >
              {uploading ? 'Uploading...' : 'Upload & Transcribe'}
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

export default UploadRecording
