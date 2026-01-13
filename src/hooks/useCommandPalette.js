import { useState, useEffect, useCallback } from 'react'

// Global state for command palette
let globalIsOpen = false
let listeners = []

const notifyListeners = () => {
  listeners.forEach(listener => listener(globalIsOpen))
}

export const useCommandPalette = () => {
  const [, forceUpdate] = useState({})

  const setIsOpen = useCallback((value) => {
    globalIsOpen = typeof value === 'function' ? value(globalIsOpen) : value
    notifyListeners()
  }, [])

  const openPalette = useCallback(() => {
    setIsOpen(true)
  }, [setIsOpen])

  const closePalette = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const togglePalette = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [setIsOpen])

  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => forceUpdate({})
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        togglePalette()
      }

      // Escape to close
      if (event.key === 'Escape' && globalIsOpen) {
        closePalette()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePalette, closePalette])

  return {
    isOpen: globalIsOpen,
    openPalette,
    closePalette,
    togglePalette,
    setIsOpen
  }
}

export default useCommandPalette
