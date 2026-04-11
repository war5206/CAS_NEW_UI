import { useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000

const EXCLUDED_PREFIXES = ['/auth', '/guide', '/screen-protect']

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel']

function isExcludedPath(pathname) {
  if (pathname === '/') return true
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}

export function useInactivityTimer() {
  const location = useLocation()
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const activeRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      navigate('/screen-protect')
    }, INACTIVITY_TIMEOUT)
  }, [clearTimer, navigate])

  useEffect(() => {
    const excluded = isExcludedPath(location.pathname)
    activeRef.current = !excluded

    if (excluded) {
      clearTimer()
      return
    }

    startTimer()

    const handleActivity = () => {
      if (activeRef.current) {
        startTimer()
      }
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      clearTimer()
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [location.pathname, startTimer, clearTimer])
}
