import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'
import RecordingInterface from '../components/RecordingInterface'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const RecordingSession = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    if (sessionId) {
      fetchSession()
    }
  }, [sessionId])

  const fetchSession = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_URL}/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSession(response.data)
    } catch (err) {
      setError('Failed to fetch session')
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTranscriptUpdate = (newTranscript) => {
    setTranscript(prev => prev + ' ' + newTranscript)
  }

  const handleBackToDashboard = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h2>
        <p className="text-gray-600 mb-8">{error || 'The requested session could not be found.'}</p>
        <button
          onClick={handleBackToDashboard}
          className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto hover-lift"
        >
          <span>🏠</span>
          <span>Back to Dashboard</span>
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="space-y-8">
        {/* Header */}
        <div className="dashboard-card">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gradient mb-2 flex items-center gap-3">
              <span className="text-3xl">🎙️</span>
              {session.title}
            </h1>
            <p className="text-gray-600 mb-4">
              Session started: {new Date(session.created_at).toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Session ID: {session.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Ready to Record</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={handleBackToDashboard}
              className="btn-secondary text-lg px-6 py-4 flex items-center gap-3 hover-lift"
            >
              <span>🏠</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recording Interface */}
      <RecordingInterface 
        sessionId={sessionId}
        onTranscriptUpdate={handleTranscriptUpdate}
      />

      {/* Full Transcript Display */}
      {transcript && (
        <div className="dashboard-card">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span>📝</span>
            Full Transcript
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default RecordingSession
