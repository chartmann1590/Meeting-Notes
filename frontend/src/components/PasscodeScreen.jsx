import React, { useState } from 'react'
import { useAuth } from '../services/AuthService'

const PasscodeScreen = () => {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(passcode)
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-[#111318] p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 dark:border-neutral-700/50 bg-[#F8F9FA] dark:bg-[#262626] p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <svg className="h-10 w-10 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6.253v11.494m-5.747-8.994l11.494 0M4.126 8.37l15.748 7.26M4.126 15.63L19.874 8.37" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100" style={{fontFamily: 'Source Code Pro, monospace'}}>Meeting Notes</h1>
          </div>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="sr-only" htmlFor="passcode">Passcode</label>
              <input 
                className="flex w-full appearance-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-neutral-900 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/50 text-center tracking-widest text-lg" 
                id="passcode" 
                placeholder="Enter your passcode" 
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>
            <button 
              className="flex w-full items-center justify-center rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus:ring-neutral-50 dark:focus:ring-offset-neutral-900" 
              type="submit"
              disabled={loading || !passcode.trim()}
            >
              {loading ? 'Verifying...' : 'Sign in'}
            </button>
          </form>
          <div className="flex items-center gap-2 pt-2 text-center">
            <span className="material-symbols-outlined !text-base text-neutral-500 dark:text-neutral-400">lock</span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Local-only. Your data stays on this machine.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default PasscodeScreen
