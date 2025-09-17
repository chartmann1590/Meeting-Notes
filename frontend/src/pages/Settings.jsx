import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const Settings = () => {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    autoDelete: true,
    retentionDays: 180,
    filenamePattern: '{date}-{title}',
    ollamaUrl: 'http://localhost:11434',
    modelName: 'Llama-3-8B-Instruct'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await axios.get(`${API_URL}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSettings(response.data)
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('auth_token')
      await axios.put(`${API_URL}/settings`, settings, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to save settings')
      console.error('Error saving settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const generatePreview = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const title = 'Project-Sync'
    return settings.filenamePattern
      .replace('{date}', date)
      .replace('{title}', title)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="relative flex min-h-screen w-full flex-col bg-slate-950 text-slate-50">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <svg className="text-slate-300" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16"></path>
            <path d="M4 12h16"></path>
            <path d="M4 18h11"></path>
          </svg>
          <h1 className="text-xl font-bold tracking-tight text-slate-200">Meeting Notes</h1>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <button 
            onClick={() => navigate('/sessions')}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            Meetings
          </button>
          <button className="text-slate-100 font-semibold border-b-2 border-blue-500 pb-1">
            Settings
          </button>
          <button className="btn btn-ghost size-9 p-0">
            <span className="material-symbols-outlined text-slate-400">help</span>
          </button>
          <div className="size-9 rounded-full bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC2VK9Nqv_y-7PRhnnuKngOOolTAaqoPaxcKztgg6-Z93eJCMkel8NxUQkShVr9K5AZMQ5xnTtzVmg3SoykadhpFS-01O7BnsF9dsVxUxyYe6Ckq2tOAIGQ5v-ixmdqpHowOIEeiuFdvTjG1zkIRY_OOm6jeQkcW_LY5m-pN3ywOiPqj5n9L8uVH0RkXVAleE_gcokarYp-xLD_t-g_P1ZG2XRWqfqXu0Vur1mqrsLiI2hyIucFuJGeKxYnycFPl07Mh0tQn5xW7vc")'}}></div>
        </nav>
      </header>
      <main className="flex flex-1 justify-center py-12">
        <div className="w-full max-w-2xl space-y-12 px-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">Settings</h2>
            <p className="mt-2 text-slate-400">Manage your application settings.</p>
          </div>
          
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-900/50 border border-green-700 text-green-200 rounded-lg">
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="space-y-8">
            <section className="space-y-6">
              <header>
                <h3 className="text-xl font-semibold text-slate-200">Retention</h3>
                <p className="text-sm text-slate-500">Control how long meeting data is stored.</p>
              </header>
              <div className="rounded-md border border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <label className="font-medium text-slate-300" htmlFor="auto-delete-toggle">Auto-delete meetings</label>
                    <p className="text-sm text-slate-500">Automatically delete meetings after a certain number of days.</p>
                  </div>
                  <label className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-slate-700 transition-colors has-[:checked]:bg-blue-600">
                    <input 
                      checked={settings.autoDelete} 
                      onChange={(e) => handleChange('autoDelete', e.target.checked)}
                      className="peer sr-only" 
                      id="auto-delete-toggle" 
                      type="checkbox"
                    />
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform peer-checked:translate-x-6"></span>
                  </label>
                </div>
                <div className="border-t border-slate-800 p-4">
                  <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="retention-days">Days to retain</label>
                  <input 
                    className="w-48 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:ring-blue-500 focus:border-blue-500" 
                    id="retention-days" 
                    type="number" 
                    value={settings.retentionDays}
                    onChange={(e) => handleChange('retentionDays', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <header>
                <h3 className="text-xl font-semibold text-slate-200">Exports</h3>
                <p className="text-sm text-slate-500">Configure default export settings.</p>
              </header>
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="filename-pattern">Default filename pattern</label>
                <input 
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:ring-blue-500 focus:border-blue-500" 
                  id="filename-pattern" 
                  type="text" 
                  value={settings.filenamePattern}
                  onChange={(e) => handleChange('filenamePattern', e.target.value)}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Preview: <code className="rounded bg-slate-800 px-1 py-0.5">{generatePreview()}</code>
                </p>
              </div>
            </section>

            <section className="space-y-6">
              <header>
                <h3 className="text-xl font-semibold text-slate-200">Models</h3>
                <p className="text-sm text-slate-500">Manage your transcription models.</p>
              </header>
              <div className="space-y-4">
                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                  <label className="block text-sm font-medium text-slate-400" htmlFor="ollama-url">Ollama base URL</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:ring-blue-500 focus:border-blue-500" 
                      id="ollama-url" 
                      type="text" 
                      value={settings.ollamaUrl}
                      onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                    />
                    <a className="text-blue-500 hover:text-blue-400 text-sm" href={settings.ollamaUrl} target="_blank" rel="noopener noreferrer">
                      <span className="material-symbols-outlined">open_in_new</span>
                    </a>
                  </div>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                  <label className="block text-sm font-medium text-slate-400 mb-2" htmlFor="model-name">Model name</label>
                  <p className="text-slate-300">{settings.modelName}</p>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <header>
                <h3 className="text-xl font-semibold text-slate-200">Security</h3>
                <p className="text-sm text-slate-500">Protect access to your application.</p>
              </header>
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                <button className="inline-flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                  Change admin passcode
                </button>
              </div>
            </section>

            <section className="space-y-6">
              <header>
                <h3 className="text-xl font-semibold text-slate-200">About</h3>
                <p className="text-sm text-slate-500">Information about the application.</p>
              </header>
              <div className="rounded-md border border-slate-800 bg-slate-900/50">
                <div className="p-4">
                  <p className="text-sm text-slate-400">Version 0.1.0</p>
                </div>
                <div className="border-t border-slate-800 p-4">
                  <button className="inline-flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors">
                    Download logs
                  </button>
                </div>
                <div className="border-t border-slate-800 p-4">
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">verified_user</span>
                    Meeting Notes is a privacy-first, local, Dockerized meeting transcriber. Your data never leaves your machine.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

export default Settings
