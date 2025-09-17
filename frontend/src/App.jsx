import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PasscodeScreen from './components/PasscodeScreen'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import RecordingSession from './pages/RecordingSession'
import SessionDetail from './pages/SessionDetail'
import UploadRecording from './pages/UploadRecording'
import Settings from './pages/Settings'
import Navigation from './components/Navigation'
import SplashScreen from './components/SplashScreen'
import ProcessingScreen from './components/ProcessingScreen'
import { AuthProvider, useAuth } from './services/AuthService'
import './App.css'

function AppContent() {
  const { isAuthenticated, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  // Show splash screen for 2 seconds on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PasscodeScreen />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/recording/:sessionId" element={<RecordingSession />} />
          <Route path="/session/:sessionId" element={<SessionDetail />} />
          <Route path="/upload" element={<UploadRecording />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/processing/:sessionId" element={<ProcessingScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
