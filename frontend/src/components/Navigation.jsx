import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../services/AuthService'

const Navigation = () => {
  const { logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Meeting Notes
        </Link>
        
                <div className="nav-links">
                  <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>📊</span>
                      Dashboard
                    </span>
                  </Link>
                  <Link
                    to="/sessions"
                    className={`nav-link ${isActive('/sessions') ? 'active' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>📝</span>
                      Sessions
                    </span>
                  </Link>
                  <Link
                    to="/upload"
                    className={`nav-link ${isActive('/upload') ? 'active' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>📤</span>
                      Upload
                    </span>
                  </Link>
                  <Link
                    to="/settings"
                    className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span>⚙️</span>
                      Settings
                    </span>
                  </Link>
                </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Online</span>
          </div>
          <button
            onClick={logout}
            className="btn-secondary flex items-center gap-2"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
