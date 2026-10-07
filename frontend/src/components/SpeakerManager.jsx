import React, { useState, useEffect } from 'react'
import axios from 'axios'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const SpeakerManager = ({ sessionId, speakers, onSpeakersUpdate }) => {
  const [editingSpeaker, setEditingSpeaker] = useState(null)
  const [newSpeakerName, setNewSpeakerName] = useState('')
  const [newSpeakerColor, setNewSpeakerColor] = useState('#3B82F6')
  const [showAddForm, setShowAddForm] = useState(false)
  const [mergeMode, setMergeMode] = useState(false)
  const [selectedSpeakers, setSelectedSpeakers] = useState([])
  const [showShortcuts, setShowShortcuts] = useState(false)

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'ctrl+m',
      action: () => setMergeMode(!mergeMode)
    },
    {
      key: 'ctrl+n',
      action: () => setShowAddForm(!showAddForm)
    },
    {
      key: 'escape',
      action: () => {
        setMergeMode(false)
        setShowAddForm(false)
        setEditingSpeaker(null)
        setSelectedSpeakers([])
      }
    },
    {
      key: 'ctrl+/',
      action: () => setShowShortcuts(!showShortcuts)
    }
  ]

  useKeyboardShortcuts(shortcuts)

  const handleSpeakerRename = async (speakerId, newName) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      await axios.put(`${API_URL}/sessions/${sessionId}/speakers`, {
        speaker_id: speakerId,
        display_name: newName,
        color: speakers.find(s => s.speaker_id === speakerId)?.color
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (onSpeakersUpdate) {
        onSpeakersUpdate()
      }
      
      setEditingSpeaker(null)
    } catch (error) {
      console.error('Error renaming speaker:', error)
    }
  }

  const handleSpeakerColorChange = async (speakerId, newColor) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      await axios.put(`${API_URL}/sessions/${sessionId}/speakers`, {
        speaker_id: speakerId,
        display_name: speakers.find(s => s.speaker_id === speakerId)?.display_name,
        color: newColor
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (onSpeakersUpdate) {
        onSpeakersUpdate()
      }
    } catch (error) {
      console.error('Error changing speaker color:', error)
    }
  }

  const handleSpeakerMerge = async () => {
    if (selectedSpeakers.length !== 2) return
    
    try {
      const token = localStorage.getItem('auth_token')
      
      await axios.post(`${API_URL}/sessions/${sessionId}/speakers/merge`, {
        source_speaker_id: selectedSpeakers[0],
        target_speaker_id: selectedSpeakers[1]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (onSpeakersUpdate) {
        onSpeakersUpdate()
      }
      
      setMergeMode(false)
      setSelectedSpeakers([])
    } catch (error) {
      console.error('Error merging speakers:', error)
    }
  }

  const handleSpeakerSelect = (speakerId) => {
    if (!mergeMode) return
    
    if (selectedSpeakers.includes(speakerId)) {
      setSelectedSpeakers(selectedSpeakers.filter(id => id !== speakerId))
    } else if (selectedSpeakers.length < 2) {
      setSelectedSpeakers([...selectedSpeakers, speakerId])
    }
  }

  const startEditing = (speaker) => {
    setEditingSpeaker(speaker.speaker_id)
    setNewSpeakerName(speaker.display_name)
    setNewSpeakerColor(speaker.color)
  }

  const cancelEditing = () => {
    setEditingSpeaker(null)
    setNewSpeakerName('')
    setNewSpeakerColor('#3B82F6')
  }

  const saveEditing = () => {
    if (newSpeakerName.trim()) {
      handleSpeakerRename(editingSpeaker, newSpeakerName.trim())
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span className="text-2xl">👥</span>
          Speaker Management
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="btn-secondary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">keyboard</span>
            Shortcuts
          </button>
          <button
            onClick={() => setMergeMode(!mergeMode)}
            className={`btn-secondary flex items-center gap-2 ${
              mergeMode ? 'bg-red-100 text-red-700 border-red-300' : ''
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {mergeMode ? 'close' : 'merge'}
            </span>
            {mergeMode ? 'Cancel Merge' : 'Merge Speakers'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Speaker
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600">keyboard</span>
            <div className="flex-1">
              <p className="text-blue-800 font-medium mb-3">Keyboard Shortcuts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Toggle Merge Mode</span>
                  <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded-sm text-xs">Ctrl + M</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Add New Speaker</span>
                  <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded-sm text-xs">Ctrl + N</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Cancel/Close</span>
                  <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded-sm text-xs">Escape</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700">Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-blue-100 text-blue-800 rounded-sm text-xs">Ctrl + /</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Instructions */}
      {mergeMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-yellow-600">info</span>
            <div>
              <p className="text-yellow-800 font-medium">Merge Mode Active</p>
              <p className="text-yellow-700 text-sm">
                Select two speakers to merge. The first speaker will be merged into the second.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Speaker Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Speaker</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speaker Name
              </label>
              <input
                type="text"
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="Enter speaker name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newSpeakerColor}
                  onChange={(e) => setNewSpeakerColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-sm cursor-pointer"
                />
                <span className="text-sm text-gray-600">{newSpeakerColor}</span>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  // This would create a new speaker - for now just close the form
                  setShowAddForm(false)
                  setNewSpeakerName('')
                  setNewSpeakerColor('#3B82F6')
                }}
                className="btn-primary w-full"
              >
                Add Speaker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speakers List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Current Speakers</h4>
        </div>
        
        <div className="divide-y divide-gray-100">
          {speakers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-4 block">person_off</span>
              <p>No speakers found. Perform diarization to detect speakers.</p>
            </div>
          ) : (
            speakers.map((speaker) => (
              <div
                key={speaker.speaker_id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  selectedSpeakers.includes(speaker.speaker_id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                } ${mergeMode ? 'cursor-pointer' : ''}`}
                onClick={() => handleSpeakerSelect(speaker.speaker_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Speaker Color and Name */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: speaker.color }}
                      ></div>
                      {editingSpeaker === speaker.speaker_id ? (
                        <input
                          type="text"
                          value={newSpeakerName}
                          onChange={(e) => setNewSpeakerName(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && saveEditing()}
                          autoFocus
                        />
                      ) : (
                        <span className="text-lg font-medium text-gray-900">
                          {speaker.display_name}
                        </span>
                      )}
                    </div>
                    
                    {/* Speaker Info */}
                    <div className="text-sm text-gray-500">
                      {speaker.segment_count} segments
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {editingSpeaker === speaker.speaker_id ? (
                      <>
                        <button
                          onClick={saveEditing}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">check</span>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(speaker)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        
                        {/* Color Picker */}
                        <div className="relative">
                          <input
                            type="color"
                            value={speaker.color}
                            onChange={(e) => handleSpeakerColorChange(speaker.speaker_id, e.target.value)}
                            className="w-8 h-8 border border-gray-300 rounded-sm cursor-pointer opacity-0 absolute"
                            id={`color-${speaker.speaker_id}`}
                          />
                          <label
                            htmlFor={`color-${speaker.speaker_id}`}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer block"
                          >
                            <span className="material-symbols-outlined text-lg">palette</span>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Color Options */}
                {editingSpeaker === speaker.speaker_id && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Choose a color:</p>
                    <div className="flex gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewSpeakerColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newSpeakerColor === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        ></button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Merge Actions */}
      {mergeMode && selectedSpeakers.length === 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">Ready to Merge</p>
              <p className="text-blue-700 text-sm">
                Merge {speakers.find(s => s.speaker_id === selectedSpeakers[0])?.display_name} into{' '}
                {speakers.find(s => s.speaker_id === selectedSpeakers[1])?.display_name}
              </p>
            </div>
            <button
              onClick={handleSpeakerMerge}
              className="btn-primary bg-red-600 hover:bg-red-700"
            >
              Confirm Merge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SpeakerManager
