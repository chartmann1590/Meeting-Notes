import { useEffect, useCallback } from 'react'

const useKeyboardShortcuts = (shortcuts) => {
  const handleKeyDown = useCallback((event) => {
    // Check if we're in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
      return
    }

    // Create a key string from the event
    const key = event.key.toLowerCase()
    const modifiers = []
    
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl')
    if (event.altKey) modifiers.push('alt')
    if (event.shiftKey) modifiers.push('shift')
    
    const keyString = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key
    
    // Find matching shortcut
    const shortcut = shortcuts.find(s => s.key === keyString)
    
    if (shortcut) {
      event.preventDefault()
      shortcut.action()
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export default useKeyboardShortcuts
