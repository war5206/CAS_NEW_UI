import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import { getUnitDeviceStatusLongNames } from '@/config/unitDeviceParamPoints'
import { parseUnitDeviceCodeLoose } from '@/config/projectUnitDevices'
import { extractRealvalMap } from '@/utils/realvalMap'
import { resolveRuntimeStatusFromPoints } from '@/utils/heatPumpRuntimeStatus'

const DEFAULT_POLL_INTERVAL_MS = 10_000

/**
 * 单台热泵：轮询 Machine_Operation、Systematic_Defrosting、Fault_Alarm、DeviceStatus。
 */
export function useUnitDeviceStatusPoll(deviceCode, { enabled = true, intervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
  const lastSuccessRef = useRef(null)
  const [runtime, setRuntime] = useState(() => lastSuccessRef.current)
  const pointNo = enabled && deviceCode ? parseUnitDeviceCodeLoose(deviceCode) : null
  const isPollable = Boolean(enabled && deviceCode && pointNo != null)

  useEffect(() => {
    if (!isPollable) {
      return undefined
    }

    const longNames = getUnitDeviceStatusLongNames(pointNo)
    const pollLongNames = [
      longNames.operation,
      longNames.defrosting,
      longNames.fault,
      longNames.commStatus,
    ]
    let cancelled = false

    const run = async () => {
      try {
        const response = await queryRealvalByLongNames(pollLongNames)
        const valueMap = extractRealvalMap(response)
        if (!valueMap || cancelled) {
          return
        }

        const nextRuntime = resolveRuntimeStatusFromPoints({
          operation: valueMap[longNames.operation],
          defrosting: valueMap[longNames.defrosting],
          fault: valueMap[longNames.fault],
          commStatus: valueMap[longNames.commStatus],
        })
        lastSuccessRef.current = nextRuntime
        setRuntime(nextRuntime)
      } catch {
        // 保留上次成功值
      }
    }

    run()
    const timerId = window.setInterval(run, intervalMs)

    return () => {
      cancelled = true
      lastSuccessRef.current = null
      window.clearInterval(timerId)
    }
  }, [deviceCode, intervalMs, isPollable, pointNo])

  if (!isPollable) {
    return null
  }

  return runtime
}
