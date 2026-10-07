import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const Sessions = () => {
  const [sessions, setSessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showExportMenu, setShowExportMenu] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    filterAndSortSessions()
  }, [sessions, searchTerm, sortBy, sortOrder])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportMenu && !event.target.closest('.export-menu')) {
        setShowExportMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

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
    } catch (err) {
      setError('Failed to create session')
      console.error('Error creating session:', err)
    }
  }

  const filterAndSortSessions = () => {
    let filtered = sessions.filter(session => {
      const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (session.device_info && session.device_info.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesSearch
    })

    // Sort sessions
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at) - new Date(b.created_at)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'duration':
          comparison = a.duration - b.duration
          break
        default:
          comparison = 0
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredSessions(filtered)
  }

  const exportSession = async (sessionId, format) => {
    try {
      setExporting(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_URL}/sessions/${sessionId}/export/${format}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // Create download link
      const blob = new Blob([response.data.content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = response.data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setShowExportMenu(null)
    } catch (err) {
      setError(`Failed to export ${format.toUpperCase()}`)
      console.error('Error exporting session:', err)
    } finally {
      setExporting(false)
    }
  }

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="relative flex h-auto min-h-screen w-full flex-col dark group/design-root overflow-x-hidden bg-[#111318]" style={{fontFamily: 'Inter, "Noto Sans", sans-serif'}}>
        <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#292e38] px-6 py-4 md:px-10">
          <div className="flex items-center gap-3 text-white">
            <span className="material-symbols-outlined text-3xl">description</span>
            <h1 className="text-xl font-bold tracking-tighter">Meeting Notes</h1>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292e38] text-gray-400 hover:bg-[#3b414d] hover:text-white">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDPy8gm4oaJJepGC9q3-Xv6bxKfwA_FIjvwg2aZ00RnVBe8VQ2ILn2IBjdg19EAB96olPb8KS3cia-5MVgmDCS5ivbIO2D6fSi6JGe-r_YojxeqNsFRv9AErYEPby8IO5Lmb49spqsylhqKe8yZ3-1nArm2VltiDWv38Nt_nJXZ5_5FoB5apVgUqoGMSbezWyEI3G2A0bPFfejD4IumhUgtidptcA9_WyyfXxGjJN7BqKOHXEKM6bg8usRQgQUyFm4iE0e-IT7eI5U")'}}></div>
          </div>
        </header>
        <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="layout-content-container w-full max-w-5xl flex-1">
            {error && (
              <div className="mb-4 rounded-md bg-red-900/50 border border-red-500/50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <span className="material-symbols-outlined text-red-400">error</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError('')}
                      className="text-red-400 hover:text-red-200"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-3xl font-bold tracking-tight text-white">Sessions Library</h2>
                <div className="flex gap-2">
                  <button className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs hover:bg-indigo-700">
                    <span className="material-symbols-outlined">add</span>
                    <span>Upload</span>
                  </button>
                  <button 
                    onClick={createNewSession}
                    className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#292e38] px-4 text-sm font-medium text-white hover:bg-[#3b414d]"
                  >
                    <span className="material-symbols-outlined">pod_cast</span>
                    <span>Start Live</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input 
                      className="w-full rounded-md border-0 bg-[#292e38] py-2.5 pl-10 pr-4 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500" 
                      placeholder="Search title, device info..." 
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="rounded-md border-0 bg-[#292e38] py-2.5 px-3 text-white focus:ring-2 focus:ring-indigo-500"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="title">Sort by Title</option>
                      <option value="duration">Sort by Duration</option>
                    </select>
                    <button 
                      className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#292e38] px-3 text-white hover:bg-[#3b414d]"
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    >
                      <span className="material-symbols-outlined">
                        {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-6xl">📝</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-3">No sessions yet</h3>
                    <p className="text-gray-400 mb-8 text-lg">
                      Start your first recording session to see it here. Your meetings will be automatically transcribed and organized.
                    </p>
                    <button
                      onClick={createNewSession}
                      className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 mx-auto"
                    >
                      <span className="material-symbols-outlined">pod_cast</span>
                      <span>Start First Session</span>
                    </button>
                  </div>
                ) : (
                  filteredSessions.map((session, index) => (
                    <div key={session.id} className="rounded-lg border border-solid border-[#292e38] bg-[#1a1d23] p-4 transition-all hover:border-indigo-500 hover:shadow-lg">
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="flex flex-1 flex-col gap-3">
                          <h3 className="text-lg font-bold text-white">{session.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                            <span>{new Date(session.created_at).toLocaleDateString()}</span>
                            <span className="text-gray-600">·</span>
                            <span>{formatDuration(session.duration)}</span>
                            <span className="text-gray-600">·</span>
                            <span>{session.device_info || 'Unknown device'}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-300">Meeting</span>
                            {session.retention_enabled && (
                              <span className="rounded-full bg-green-900/50 px-2 py-1 text-xs font-medium text-green-300">Retained</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/session/${session.id}`}
                            className="flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#292e38] px-4 text-sm font-medium text-white hover:bg-[#3b414d]"
                          >
                            Open
                          </Link>
                          <div className="relative export-menu">
                            <button 
                              className="flex h-9 w-9 items-center justify-center rounded-md bg-[#292e38] text-gray-400 hover:bg-[#3b414d] hover:text-white"
                              onClick={() => setShowExportMenu(showExportMenu === session.id ? null : session.id)}
                            >
                              <span className="material-symbols-outlined text-xl">download</span>
                            </button>
                            {showExportMenu === session.id && (
                              <div className="absolute right-0 top-10 z-10 w-48 rounded-md bg-[#1a1d23] border border-[#292e38] shadow-lg">
                                <div className="py-1">
                                  <button
                                    onClick={() => exportSession(session.id, 'md')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">description</span>
                                    Export Markdown
                                  </button>
                                  <button
                                    onClick={() => exportSession(session.id, 'txt')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">text_snippet</span>
                                    Export Text
                                  </button>
                                  <button
                                    onClick={() => exportSession(session.id, 'json')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">code</span>
                                    Export JSON
                                  </button>
                                  <button
                                    onClick={() => exportSession(session.id, 'srt')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">subtitles</span>
                                    Export SRT
                                  </button>
                                  <button
                                    onClick={() => exportSession(session.id, 'vtt')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">closed_caption</span>
                                    Export VTT
                                  </button>
                                  <button
                                    onClick={() => exportSession(session.id, 'csv')}
                                    disabled={exporting}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-white hover:bg-[#292e38] disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-base">table_chart</span>
                                    Export CSV
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredSessions.length > 0 && (
                <div className="flex items-center justify-center p-4">
                  <nav className="flex items-center gap-1">
                    <a className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#292e38] hover:text-white" href="#">
                      <span className="material-symbols-outlined">chevron_left</span>
                    </a>
                    <a className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white" href="#">1</a>
                    <a className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-normal text-white hover:bg-[#292e38]" href="#">2</a>
                    <a className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-normal text-white hover:bg-[#292e38]" href="#">3</a>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-normal text-white">...</span>
                    <a className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-normal text-white hover:bg-[#292e38]" href="#">10</a>
                    <a className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-[#292e38] hover:text-white" href="#">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </a>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  )
}

export default Sessions
