import { useState, useEffect } from 'react'

export const useDevice = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setScreenSize({ width, height })

      // Mobile: < 768px
      // Tablet: 768px - 1024px
      // Desktop: > 1024px
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsDesktop(width >= 1024)
    }

    // Check on mount
    checkDevice()

    // Add event listener
    window.addEventListener('resize', checkDevice)

    // Cleanup
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    // Utility functions
    isTouchDevice: 'ontouchstart' in window,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

export default useDevice
