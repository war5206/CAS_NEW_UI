import { useEffect, useState } from 'react'

const scheduleWhenIdle = (callback) => {
  if (typeof window === 'undefined') {
    callback()
    return () => {}
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout: 300 })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = window.setTimeout(callback, 120)
  return () => window.clearTimeout(timeoutId)
}

export const useDeferredVisible = (targetRef) => {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isReady) {
      return undefined
    }

    const targetNode = targetRef.current
    if (!targetNode) {
      return undefined
    }

    let cancelIdleSchedule = null
    const startInitialization = () => {
      cancelIdleSchedule = scheduleWhenIdle(() => setIsReady(true))
    }

    if (typeof window.IntersectionObserver !== 'function') {
      startInitialization()
      return () => {
        cancelIdleSchedule?.()
      }
    }

    const visibilityObserver = new window.IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)
        if (!isVisible) {
          return
        }

        visibilityObserver.disconnect()
        startInitialization()
      },
      { threshold: 0.01 },
    )

    visibilityObserver.observe(targetNode)

    return () => {
      visibilityObserver.disconnect()
      cancelIdleSchedule?.()
    }
  }, [isReady, targetRef])

  return isReady
}

