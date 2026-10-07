import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const Dashboard = () => {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_URL}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSessions(response.data)
    } catch (err) {
      setError('Failed to fetch sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const createNewSession = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await axios.post(`${API_URL}/sessions`, {
        title: `Session ${new Date().toLocaleString()}`,
        device_info: navigator.userAgent
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSessions([response.data, ...sessions])
      // Navigate to recording session
      navigate(`/recording/${response.data.id}`)
    } catch (err) {
      setError('Failed to create session')
      console.error('Error creating session:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8 fade-in">
        <div className="space-y-8">
        {/* Hero Section */}
        <div className="dashboard-card">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gradient mb-4">
                Welcome to Meeting Notes
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Transform your meetings into actionable insights with AI-powered transcription, 
                speaker diarization, and intelligent summaries.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Real-time transcription</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Speaker identification</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>AI summaries</span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={createNewSession}
                className="btn-primary text-lg px-8 py-4 flex items-center gap-3 hover-lift"
              >
                <span className="text-2xl">🎙️</span>
                <span>Start New Session</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="dashboard-card text-center hover-lift">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{sessions.length}</div>
            <div className="text-gray-600 font-medium">Total Sessions</div>
          </div>
          
          <div className="dashboard-card text-center hover-lift">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {Math.floor(sessions.reduce((total, session) => total + session.duration, 0) / 60)}h {sessions.reduce((total, session) => total + session.duration, 0) % 60}m
            </div>
            <div className="text-gray-600 font-medium">Total Duration</div>
          </div>
          
          <div className="dashboard-card text-center hover-lift">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {sessions.filter(s => s.retention_enabled).length}
            </div>
            <div className="text-gray-600 font-medium">Retention Enabled</div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span>📝</span>
              Recent Sessions
            </h3>
            <Link 
              to="/sessions" 
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
            >
              View All
              <span>→</span>
            </Link>
          </div>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎙️</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h4>
              <p className="text-gray-600 mb-6">Start your first recording session to see it here!</p>
              <button
                onClick={createNewSession}
                className="btn-primary"
              >
                Start Recording
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session, index) => (
                <div 
                  key={session.id} 
                  className="border border-gray-200 rounded-xl p-6 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover-lift group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-semibold">
                          {index + 1}
                        </div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {session.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 ml-11">
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{new Date(session.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🕐</span>
                          <span>{new Date(session.created_at).toLocaleTimeString()}</span>
                        </div>
                        {session.duration > 0 && (
                          <div className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{Math.floor(session.duration / 60)}m {session.duration % 60}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-sm">
                        ID: {session.id.slice(0, 8)}...
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 hover:text-primary-700">
                        <span className="text-lg">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
