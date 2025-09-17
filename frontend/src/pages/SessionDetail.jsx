import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'
import TimelineView from '../components/TimelineView'
import SpeakerManager from '../components/SpeakerManager'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const SessionDetail = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [speakers, setSpeakers] = useState([])
  const [segments, setSegments] = useState([])
  const [aiData, setAiData] = useState({
    summary: null,
    actionItems: [],
    followUps: [],
    risks: []
  })
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiProcessed, setAiProcessed] = useState(false)
  const [exporting, setExporting] = useState(false)

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
      
      // Also fetch speakers, segments, and AI data
      await Promise.all([
        fetchSpeakersAndSegments(),
        fetchAiData()
      ])
    } catch (err) {
      setError('Failed to fetch session')
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpeakersAndSegments = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      
      const [speakersResponse, segmentsResponse] = await Promise.all([
        axios.get(`${API_URL}/sessions/${sessionId}/speakers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sessions/${sessionId}/segments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setSpeakers(speakersResponse.data)
      setSegments(segmentsResponse.data)
    } catch (err) {
      console.error('Error fetching speakers and segments:', err)
    }
  }

  const fetchAiData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      
      const [summaryResponse, actionItemsResponse, followUpsResponse, risksResponse] = await Promise.all([
        axios.get(`${API_URL}/sessions/${sessionId}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/sessions/${sessionId}/action-items`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/sessions/${sessionId}/follow-ups`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/sessions/${sessionId}/risks`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ])
      
      setAiData({
        summary: summaryResponse.data,
        actionItems: actionItemsResponse.data || [],
        followUps: followUpsResponse.data || [],
        risks: risksResponse.data || []
      })
      
      // Check if any AI data exists
      const hasAiData = summaryResponse.data || 
                       (actionItemsResponse.data && actionItemsResponse.data.length > 0) ||
                       (followUpsResponse.data && followUpsResponse.data.length > 0) ||
                       (risksResponse.data && risksResponse.data.length > 0)
      setAiProcessed(hasAiData)
    } catch (err) {
      console.error('Error fetching AI data:', err)
    }
  }

  const processWithAI = async () => {
    try {
      setAiProcessing(true)
      const token = localStorage.getItem('auth_token')
      
      // Queue for background processing
      const response = await axios.post(`${API_URL}/sessions/${sessionId}/ai/queue`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.message === 'Session queued for AI processing') {
        // Start polling for status updates
        pollProcessingStatus()
      }
    } catch (err) {
      console.error('Error processing with AI:', err)
      alert('Failed to process session with AI. Please try again.')
      setAiProcessing(false)
    }
  }

  const pollProcessingStatus = async () => {
    const token = localStorage.getItem('auth_token')
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/sessions/${sessionId}/ai/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const status = response.data.status
        
        if (status === 'completed') {
          clearInterval(pollInterval)
          setAiProcessing(false)
          setAiProcessed(true)
          // Refresh AI data
          await fetchAiData()
        } else if (status === 'failed') {
          clearInterval(pollInterval)
          setAiProcessing(false)
          alert(`AI processing failed: ${response.data.error}`)
        }
        // Continue polling for 'queued' and 'processing' statuses
      } catch (err) {
        console.error('Error checking processing status:', err)
        clearInterval(pollInterval)
        setAiProcessing(false)
      }
    }, 2000) // Poll every 2 seconds
  }

  const exportSession = async (format) => {
    try {
      setExporting(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_URL}/sessions/${sessionId}/export/${format}`, {
        headers: { Authorization: `Bearer ${token}` }
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
    } catch (error) {
      console.error(`Error exporting ${format}:`, error)
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = () => exportSession('json')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading session details...</p>
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
          onClick={() => navigate('/sessions')}
          className="btn-primary text-lg px-8 py-4 flex items-center gap-3 mx-auto hover-lift"
        >
          <span>🏠</span>
          <span>Back to Sessions</span>
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="relative flex min-h-screen w-full flex-col dark group/design-root overflow-x-hidden" style={{fontFamily: 'Inter, "Noto Sans", sans-serif'}}>
        <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#292e38] px-10 py-3">
          <div className="flex items-center gap-4 text-white">
            <svg className="h-6 w-6 text-[#195de6]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.5 3.75H4.5C4.08579 3.75 3.75 4.08579 3.75 4.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M8.25 3V3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M15.75 3V3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M3.75 8.25H20.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M8.25 12.75H9.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M8.25 15.75H9.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M12.75 12.75H14.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
              <path d="M12.75 15.75H14.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"></path>
            </svg>
            <h1 className="text-white text-lg font-bold">Meeting Notes</h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/')}
                className="text-sm font-medium text-white hover:text-gray-300"
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className="text-sm font-medium text-white hover:text-gray-300"
              >
                Sessions
              </button>
              <button className="text-sm font-medium text-white hover:text-gray-300">
                Settings
              </button>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#292e38] text-[#9da6b8] transition-colors hover:bg-[#195de6] hover:text-white">
                <span className="material-symbols-outlined">help</span>
              </button>
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDl70ykIX4n4O4c5VQMMb4VzhjPQs6VqKm1fOue0-zRc_2Vylj_enmJX-5dZMgMRkC4ElTTxIrknYYnNNjIZ4zj4q3P8ZHlzrsmCAbHUeHSM8Wghk0LNEKE4MmkT2v9FUDrNCAs4uZV7yGf4ZSd60XAO_HutiWPOBOEZWVl0YGuJ27n7xluifBaUUIDl0akFFD0CjECAdKMUO095vSj43JDyvg9PQILz3hix7R2xNpa5c7BK3GBm10oNMZ6QDBP-hBcqgqDChyzfL8")'}}></div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 justify-center py-8 px-4 sm:px-6 lg:px-8">
          <div className="layout-content-container flex w-full max-w-5xl flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
                  {session.title}
                </h2>
                <div className="text-sm font-normal text-[#9da6b8] flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  <span className="text-[#292e38]">·</span>
                  <span>{new Date(session.created_at).toLocaleTimeString()}</span>
                  <span className="text-[#292e38]">·</span>
                  <span>{session.duration > 0 ? `${Math.floor(session.duration / 60)}h ${session.duration % 60}m` : '0h'}</span>
                  <span className="text-[#292e38]">·</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#292e38] px-2 py-0.5 text-xs text-white">#Meeting</span>
                    <span className="rounded-full bg-[#292e38] px-2 py-0.5 text-xs text-white">#Transcription</span>
                    <span className="rounded-full bg-[#292e38] px-2 py-0.5 text-xs text-white">#AI</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('exports')}
                  className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#292e38] px-3 text-sm font-medium text-white transition-colors hover:bg-[#195de6]"
                >
                  <span className="material-symbols-outlined text-base">ios_share</span>
                  <span className="truncate">Export</span>
                </button>
                <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#292e38] px-3 text-sm font-medium text-white transition-colors hover:bg-[#195de6]">
                  <span className="material-symbols-outlined text-base">label</span>
                  <span className="truncate">Edit Labels</span>
                </button>
                <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#292e38] px-3 text-sm font-medium text-white transition-colors hover:bg-[#195de6]">
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  <span className="truncate">Duplicate</span>
                </button>
              </div>
            </div>
            <div className="border-b border-[#292e38]">
              <div className="flex gap-6 px-4">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'summary' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Summary
                </button>
                <button 
                  onClick={() => setActiveTab('transcript')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'transcript' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Transcript
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'timeline' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Timeline
                </button>
                <button 
                  onClick={() => setActiveTab('speakers')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'speakers' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Speakers
                </button>
                <button 
                  onClick={() => setActiveTab('results')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'results' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Results
                </button>
                <button 
                  onClick={() => setActiveTab('exports')}
                  className={`flex items-center justify-center border-b-2 pb-3 pt-2 text-sm font-medium transition-colors ${
                    activeTab === 'exports' 
                      ? 'border-b-white text-white' 
                      : 'border-b-transparent text-[#9da6b8] hover:border-b-[#9da6b8] hover:text-white'
                  }`}
                >
                  Exports
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {activeTab === 'summary' && (
                <>
                  <div className="rounded-lg bg-[#292e38] p-6">
                    <h3 className="text-xl font-bold text-white mb-2">TL;DR</h3>
                    <p className="text-base text-[#9da6b8]">
                      The {session.title} meeting established key project goals, timelines, and team roles. 
                      Key action items include finalizing the project plan, setting up communication 
                      channels, and scheduling the next meeting.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight tracking-tight text-white mb-4 px-1">
                      Action Items
                    </h3>
                    <div className="overflow-x-auto">
                      <div className="rounded-lg border border-[#292e38] bg-[#1a1d23]">
                        <table className="min-w-full divide-y divide-[#292e38]">
                          <thead className="bg-[#1c1f26]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Title</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Owner</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Due Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Priority</th>
                              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Source</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#292e38]">
                            <tr>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Finalize Project Plan</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">Ethan Carter</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">August 2, 2024</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="px-2.5 py-1 text-xs font-semibold leading-5 rounded-full bg-red-900/50 text-red-300">High</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8] font-mono">00:05:20</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Set Up Communication Channels</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">Sophia Clark</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">July 29, 2024</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="px-2.5 py-1 text-xs font-semibold leading-5 rounded-full bg-yellow-900/50 text-yellow-300">Medium</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8] font-mono">00:12:45</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">Schedule Next Meeting</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">Team</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8]">July 31, 2024</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <span className="px-2.5 py-1 text-xs font-semibold leading-5 rounded-full bg-green-900/50 text-green-300">Low</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-[#9da6b8] font-mono">00:25:10</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight tracking-tight text-white mb-4 px-1">Follow-ups / Risks</h3>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-[#292e38] bg-[#1a1d23] p-4">
                        <p className="font-medium text-white">Resource Access</p>
                        <p className="text-sm text-[#9da6b8]">Ensure all team members have access to project resources.</p>
                      </div>
                      <div className="rounded-lg border border-[#292e38] bg-[#1a1d23] p-4">
                        <p className="font-medium text-white">Progress Monitoring</p>
                        <p className="text-sm text-[#9da6b8]">Monitor project progress closely to identify and mitigate potential delays.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-start gap-3 pt-4">
                    <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#292e38] px-4 text-sm font-bold text-white transition-colors hover:bg-opacity-80">
                      <span className="material-symbols-outlined text-base">content_paste</span>
                      <span>Copy All</span>
                    </button>
                    <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#195de6] px-4 text-sm font-bold text-white transition-colors hover:bg-opacity-80">
                      <span className="material-symbols-outlined text-base">download</span>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </>
              )}
              {activeTab === 'transcript' && (
                <div className="rounded-lg bg-[#292e38] p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Full Transcript</h3>
                  <div className="space-y-4 text-[#9da6b8]">
                    {segments.length === 0 ? (
                      <p>No transcript segments found. Start recording to see transcript content here.</p>
                    ) : (
                      segments.map((segment, index) => (
                        <div key={segment.id} className="border-l-2 border-[#195de6] pl-4 py-2">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs text-[#195de6] font-mono">
                              {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(0).padStart(2, '0')}
                            </span>
                            <span className="text-sm text-white font-medium">
                              {speakers.find(s => s.speaker_id === segment.speaker_id)?.display_name || `Speaker ${segment.speaker_id.split('_')[1] || 'Unknown'}`}
                            </span>
                          </div>
                          <p className="text-[#9da6b8] leading-relaxed">{segment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'timeline' && (
                <div className="rounded-lg bg-[#292e38] p-6">
                  <TimelineView 
                    sessionId={sessionId}
                    onSpeakerUpdate={() => fetchSpeakersAndSegments()}
                    onSpeakerMerge={() => fetchSpeakersAndSegments()}
                  />
                </div>
              )}
              {activeTab === 'speakers' && (
                <div className="rounded-lg bg-[#292e38] p-6">
                  <SpeakerManager 
                    sessionId={sessionId}
                    speakers={speakers}
                    onSpeakersUpdate={() => fetchSpeakersAndSegments()}
                  />
                </div>
              )}
              {activeTab === 'results' && (
                <div className="space-y-6">
                  {/* AI Processing Status */}
                  <div className="rounded-lg bg-[#292e38] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">AI Analysis</h3>
                      {!aiProcessed && (
                        <button
                          onClick={processWithAI}
                          disabled={aiProcessing}
                          className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#195de6] px-4 text-sm font-bold text-white transition-colors hover:bg-opacity-80 disabled:opacity-50"
                        >
                          {aiProcessing ? (
                            <>
                              <div className="loading-spinner w-4 h-4"></div>
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-base">psychology</span>
                              <span>Generate AI Analysis</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {aiProcessing && (
                      <div className="bg-[#1a1d23] rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="loading-spinner"></div>
                          <div>
                            <p className="text-white font-medium">AI is analyzing your meeting...</p>
                            <p className="text-sm text-[#9da6b8]">This may take a few minutes</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!aiProcessed && !aiProcessing && (
                      <div className="bg-[#1a1d23] rounded-lg p-4">
                        <p className="text-[#9da6b8]">No AI analysis available yet. Click "Generate AI Analysis" to get summaries, action items, and insights.</p>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  {aiData.summary && (
                    <div className="rounded-lg bg-[#292e38] p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Summary</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-2">TL;DR</h4>
                          <p className="text-[#9da6b8] leading-relaxed">{aiData.summary.tldr}</p>
                        </div>
                        {aiData.summary.key_topics && aiData.summary.key_topics.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-2">Key Topics</h4>
                            <div className="flex flex-wrap gap-2">
                              {aiData.summary.key_topics.map((topic, index) => (
                                <span key={index} className="rounded-full bg-[#195de6] px-3 py-1 text-sm text-white">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiData.summary.meeting_type && (
                          <div>
                            <h4 className="text-lg font-semibold text-white mb-2">Meeting Type</h4>
                            <span className="rounded-full bg-[#292e38] px-3 py-1 text-sm text-[#9da6b8] capitalize">
                              {aiData.summary.meeting_type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {aiData.actionItems.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold leading-tight tracking-tight text-white mb-4 px-1">
                        Action Items
                      </h3>
                      <div className="overflow-x-auto">
                        <div className="rounded-lg border border-[#292e38] bg-[#1a1d23]">
                          <table className="min-w-full divide-y divide-[#292e38]">
                            <thead className="bg-[#1c1f26]">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Task</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Owner</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Due Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#9da6b8]">Context</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#292e38]">
                              {aiData.actionItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-4 text-sm font-medium text-white">{item.task}</td>
                                  <td className="px-4 py-4 text-sm text-[#9da6b8]">{item.owner}</td>
                                  <td className="px-4 py-4 text-sm text-[#9da6b8]">{item.due_date}</td>
                                  <td className="px-4 py-4 text-sm">
                                    <span className={`px-2.5 py-1 text-xs font-semibold leading-5 rounded-full ${
                                      item.priority === 'high' ? 'bg-red-900/50 text-red-300' :
                                      item.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                                      'bg-green-900/50 text-green-300'
                                    }`}>
                                      {item.priority || 'medium'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-[#9da6b8]">{item.context || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Follow-ups */}
                  {aiData.followUps.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold leading-tight tracking-tight text-white mb-4 px-1">
                        Follow-up Questions
                      </h3>
                      <div className="space-y-3">
                        {aiData.followUps.map((followUp) => (
                          <div key={followUp.id} className="rounded-lg border border-[#292e38] bg-[#1a1d23] p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-white mb-1">{followUp.question}</p>
                                {followUp.context && (
                                  <p className="text-sm text-[#9da6b8]">{followUp.context}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {followUp.category && (
                                  <span className="rounded-full bg-[#292e38] px-2 py-1 text-xs text-[#9da6b8]">
                                    {followUp.category}
                                  </span>
                                )}
                                {followUp.urgency && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    followUp.urgency === 'high' ? 'bg-red-900/50 text-red-300' :
                                    followUp.urgency === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                                    'bg-green-900/50 text-green-300'
                                  }`}>
                                    {followUp.urgency}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {aiData.risks.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold leading-tight tracking-tight text-white mb-4 px-1">
                        Identified Risks
                      </h3>
                      <div className="space-y-3">
                        {aiData.risks.map((risk) => (
                          <div key={risk.id} className="rounded-lg border border-[#292e38] bg-[#1a1d23] p-4">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-medium text-white">{risk.risk_description}</p>
                              <div className="flex items-center gap-2 ml-4">
                                {risk.impact && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    risk.impact === 'high' ? 'bg-red-900/50 text-red-300' :
                                    risk.impact === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                                    'bg-green-900/50 text-green-300'
                                  }`}>
                                    Impact: {risk.impact}
                                  </span>
                                )}
                                {risk.likelihood && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    risk.likelihood === 'high' ? 'bg-red-900/50 text-red-300' :
                                    risk.likelihood === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                                    'bg-green-900/50 text-green-300'
                                  }`}>
                                    Likelihood: {risk.likelihood}
                                  </span>
                                )}
                              </div>
                            </div>
                            {risk.mitigation && (
                              <p className="text-sm text-[#9da6b8]">
                                <span className="font-medium text-white">Mitigation:</span> {risk.mitigation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Actions */}
                  {aiProcessed && (
                    <div className="flex items-center justify-start gap-3 pt-4">
                      <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#292e38] px-4 text-sm font-bold text-white transition-colors hover:bg-opacity-80">
                        <span className="material-symbols-outlined text-base">content_paste</span>
                        <span>Copy All</span>
                      </button>
                      <button className="flex h-10 items-center justify-center gap-2 rounded-md bg-[#195de6] px-4 text-sm font-bold text-white transition-colors hover:bg-opacity-80">
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Export CSV</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'exports' && (
                <div className="rounded-lg bg-[#292e38] p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Export Options</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => exportSession('md')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">description</span>
                        <p className="text-sm text-white">Markdown</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Full Report</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportSession('txt')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">text_snippet</span>
                        <p className="text-sm text-white">Text</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Plain Text</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportSession('json')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">code</span>
                        <p className="text-sm text-white">JSON</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Structured Data</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportSession('srt')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">subtitles</span>
                        <p className="text-sm text-white">SRT</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Subtitles</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportSession('vtt')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">closed_caption</span>
                        <p className="text-sm text-white">VTT</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Web Captions</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportSession('csv')}
                      disabled={exporting}
                      className="p-4 border border-[#1a1d23] rounded-lg hover:bg-[#1a1d23] transition-colors disabled:opacity-50"
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-2xl text-white mb-2 block">table_chart</span>
                        <p className="text-sm text-white">CSV</p>
                        <p className="text-xs text-[#9da6b8] mt-1">Action Items</p>
                      </div>
                    </button>
                  </div>
                  
                  {exporting && (
                    <div className="mt-4 p-4 bg-[#1a1d23] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="loading-spinner"></div>
                        <p className="text-white">Preparing export...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Export Info */}
                  <div className="mt-6 p-4 bg-[#1a1d23] rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-2">Export Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#9da6b8]">
                      <div>
                        <span className="font-medium text-white">Total Segments:</span>
                        <span className="ml-2">{segments.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-white">Total Speakers:</span>
                        <span className="ml-2">{speakers.length}</span>
                      </div>
                      <div>
                        <span className="font-medium text-white">Session Duration:</span>
                        <span className="ml-2">{session ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : '0m'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-white">Last Updated:</span>
                        <span className="ml-2">{new Date().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
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

export default SessionDetail
