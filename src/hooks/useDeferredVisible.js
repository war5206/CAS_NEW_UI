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

    let frameId = null
    let visibilityObserver = null
    let cancelIdleSchedule = null
    let isCancelled = false

    const startInitialization = () => {
      cancelIdleSchedule = scheduleWhenIdle(() => {
        if (!isCancelled) {
          setIsReady(true)
        }
      })
    }

    const connectWhenTargetReady = () => {
      if (isCancelled) {
        return
      }

      const targetNode = targetRef.current
      if (!targetNode) {
        if (typeof window === 'undefined') {
          startInitialization()
          return
        }

        frameId = window.requestAnimationFrame(connectWhenTargetReady)
        return
      }

      if (typeof window.IntersectionObserver !== 'function') {
        startInitialization()
        return
      }

      visibilityObserver = new window.IntersectionObserver(
        (entries) => {
          const isVisible = entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)
          if (!isVisible) {
            return
          }

          visibilityObserver?.disconnect()
          startInitialization()
        },
        { threshold: 0.01 },
      )

      visibilityObserver.observe(targetNode)
    }

    connectWhenTargetReady()

    return () => {
      isCancelled = true
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      visibilityObserver?.disconnect()
      cancelIdleSchedule?.()
    }
  }, [isReady, targetRef])

  return isReady
}
