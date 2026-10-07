import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const TimelineView = ({ sessionId, onSpeakerUpdate, onSpeakerMerge }) => {
  const [segments, setSegments] = useState([])
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [isDiarizing, setIsDiarizing] = useState(false)
  const timelineRef = useRef(null)

  useEffect(() => {
    if (sessionId) {
      fetchData()
    }
  }, [sessionId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      // Fetch segments and speakers in parallel
      const [segmentsResponse, speakersResponse] = await Promise.all([
        axios.get(`${API_URL}/sessions/${sessionId}/segments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sessions/${sessionId}/speakers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      setSegments(segmentsResponse.data)
      setSpeakers(speakersResponse.data)
    } catch (error) {
      console.error('Error fetching timeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiarize = async () => {
    try {
      setIsDiarizing(true)
      const token = localStorage.getItem('auth_token')
      
      await axios.post(`${API_URL}/api/diarize`, {
        session_id: parseInt(sessionId),
        min_speakers: 1,
        max_speakers: 10
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Refresh data after diarization
      await fetchData()
    } catch (error) {
      console.error('Error performing diarization:', error)
    } finally {
      setIsDiarizing(false)
    }
  }

  const handleSpeakerChange = async (segmentId, newSpeakerId) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      // Update the segment's speaker
      const updatedSegments = segments.map(seg => 
        seg.id === segmentId ? { ...seg, speaker_id: newSpeakerId } : seg
      )
      setSegments(updatedSegments)
      
      // Call the API to update the speaker
      await axios.put(`${API_URL}/sessions/${sessionId}/speakers`, {
        speaker_id: newSpeakerId,
        display_name: speakers.find(s => s.speaker_id === newSpeakerId)?.display_name || `Speaker ${newSpeakerId.split('_')[1]}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (onSpeakerUpdate) {
        onSpeakerUpdate(segmentId, newSpeakerId)
      }
    } catch (error) {
      console.error('Error updating speaker:', error)
    }
  }

  const handleSpeakerMerge = async (sourceSpeakerId, targetSpeakerId) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      await axios.post(`${API_URL}/sessions/${sessionId}/speakers/merge`, {
        source_speaker_id: sourceSpeakerId,
        target_speaker_id: targetSpeakerId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Refresh data after merge
      await fetchData()
      
      if (onSpeakerMerge) {
        onSpeakerMerge(sourceSpeakerId, targetSpeakerId)
      }
    } catch (error) {
      console.error('Error merging speakers:', error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSpeakerColor = (speakerId) => {
    const speaker = speakers.find(s => s.speaker_id === speakerId)
    return speaker?.color || '#3B82F6'
  }

  const getSpeakerName = (speakerId) => {
    const speaker = speakers.find(s => s.speaker_id === speakerId)
    return speaker?.display_name || `Speaker ${speakerId.split('_')[1] || 'Unknown'}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span className="text-2xl">⏱️</span>
          Timeline View
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDiarize}
            disabled={isDiarizing}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">
              {isDiarizing ? 'hourglass_empty' : 'auto_awesome'}
            </span>
            {isDiarizing ? 'Processing...' : 'Auto-Diarize'}
          </button>
          <button
            onClick={fetchData}
            className="btn-secondary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Speaker Legend */}
      {speakers.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Speakers</h4>
          <div className="flex flex-wrap gap-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.speaker_id}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: speaker.color }}
                ></div>
                <span className="text-sm font-medium text-gray-900">
                  {speaker.display_name}
                </span>
                <span className="text-xs text-gray-500">
                  ({speaker.segment_count} segments)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Transcript Segments</h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {segments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-4 block">mic_off</span>
              <p>No segments found. Start recording to see transcript segments here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedSegment?.id === segment.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedSegment(segment)}
                >
                  <div className="flex items-start gap-4">
                    {/* Time and Speaker */}
                    <div className="shrink-0 w-32">
                      <div className="text-sm font-mono text-gray-500 mb-1">
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getSpeakerColor(segment.speaker_id) }}
                        ></div>
                        <select
                          value={segment.speaker_id}
                          onChange={(e) => handleSpeakerChange(segment.id, e.target.value)}
                          className="text-xs bg-transparent border-none focus:outline-hidden focus:ring-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {speakers.map((speaker) => (
                            <option key={speaker.speaker_id} value={speaker.speaker_id}>
                              {speaker.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Text Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 leading-relaxed">
                        {segment.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Confidence: {Math.round(segment.confidence * 100)}%</span>
                        <span>Segment #{index + 1}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">Selected Segment</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Time:</span>
              <span className="ml-2 text-blue-700">
                {formatTime(selectedSegment.start)} - {formatTime(selectedSegment.end)}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Speaker:</span>
              <span className="ml-2 text-blue-700">{getSpeakerName(selectedSegment.speaker_id)}</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Confidence:</span>
              <span className="ml-2 text-blue-700">{Math.round(selectedSegment.confidence * 100)}%</span>
            </div>
            <div>
              <span className="font-medium text-blue-900">Duration:</span>
              <span className="ml-2 text-blue-700">
                {formatTime(selectedSegment.end - selectedSegment.start)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimelineView
