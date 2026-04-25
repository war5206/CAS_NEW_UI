import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '../api/modules/settings'
import { extractRealvalMap } from '../utils/realvalMap'

const DEFAULT_INTERVAL_MS = 10_000

/**
 * 进入页面后轮询 queryRealvalByLongNames，将成功解析的 valueMap 交给 onData
 * @param {string[]} longNames
 * @param {(valueMap: Record<string, unknown> | null) => void} onData
 * @param {number} [intervalMs]
 */
export function usePollRealvals(longNames, onData, intervalMs = DEFAULT_INTERVAL_MS) {
  const onDataRef = useRef(onData)
  const longNamesRef = useRef(longNames)
  const namesKey = longNames.join('\u0000')
  const [isInitialAttemptDone, setIsInitialAttemptDone] = useState(false)

  useEffect(() => {
    onDataRef.current = onData
  }, [onData])

  useEffect(() => {
    longNamesRef.current = longNames
  }, [longNames])

  useEffect(() => {
    setIsInitialAttemptDone(false)
    let cancelled = false
    let firstRun = true
    const run = async () => {
      const names = longNamesRef.current
      if (!names.length) return
      try {
        const response = await queryRealvalByLongNames(names)
        const valueMap = extractRealvalMap(response)
        if (!cancelled) onDataRef.current(valueMap)
      } catch {
        if (!cancelled) onDataRef.current(null)
      } finally {
        if (!cancelled && firstRun) {
          setIsInitialAttemptDone(true)
          firstRun = false
        }
      }
    }
    run()
    const timerId = window.setInterval(run, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [namesKey, intervalMs])

  return {
    isInitialAttemptDone,
  }
}
