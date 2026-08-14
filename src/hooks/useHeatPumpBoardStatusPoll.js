import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import { buildHomeUnitStatusPollLongNames } from '@/config/heatPumpUnitStatusPoints'
import { resolveBoardStatusDeviceIds, resolveHeatPumpCountFromValueMap, toUnitDeviceCode } from '@/config/projectUnitDevices'
import { STANDARD_DEFAULT_HEAT_PUMP_COUNT } from '@/config/projectProfile'
import { getUnitDeviceStatusLongNames } from '@/config/unitDeviceParamPoints'
import { extractRealvalMap } from '@/utils/realvalMap'
import { resolveRuntimeStatusFromPoints } from '@/utils/heatPumpRuntimeStatus'

const POLL_INTERVAL_MS = 10_000

function buildStatusMapFromValueMap(valueMap, deviceIds) {
  const statusByCode = new Map()

  deviceIds.forEach((pointNo) => {
    const code = toUnitDeviceCode(pointNo)
    const longNames = getUnitDeviceStatusLongNames(pointNo)
    statusByCode.set(
      code,
      resolveRuntimeStatusFromPoints({
        operation: valueMap[longNames.operation],
        defrosting: valueMap[longNames.defrosting],
        fault: valueMap[longNames.fault],
        commStatus: valueMap[longNames.commStatus],
      }),
    )
  })

  return statusByCode
}

async function queryBoardStatusMap(heatPumpCount) {
  const longNames = buildHomeUnitStatusPollLongNames(heatPumpCount)
  const response = await queryRealvalByLongNames(longNames)
  let valueMap = extractRealvalMap(response)
  if (!valueMap) {
    return null
  }

  const resolvedCount = resolveHeatPumpCountFromValueMap(valueMap, heatPumpCount)
  if (resolvedCount > heatPumpCount) {
    const expandedLongNames = buildHomeUnitStatusPollLongNames(resolvedCount)
    if (expandedLongNames.length > longNames.length) {
      const retryResponse = await queryRealvalByLongNames(expandedLongNames)
      const retryMap = extractRealvalMap(retryResponse)
      if (retryMap) {
        valueMap = retryMap
      }
    }
  }

  const deviceIds = resolveBoardStatusDeviceIds({ heatPumpCount: resolvedCount })
  return {
    statusByCode: buildStatusMapFromValueMap(valueMap, deviceIds),
    resolvedCount,
  }
}

/**
 * 热泵总览网格：轮询 Machine_Operation / Systematic_Defrosting / Fault_Alarm 实时状态。
 * 轮询范围由 Sys\FinforWorx\HPTotalNumber 决定。
 */
export function useHeatPumpBoardStatusPoll({ enabled = true } = {}) {
  const heatPumpCountRef = useRef(STANDARD_DEFAULT_HEAT_PUMP_COUNT)
  const [liveStatusByCode, setLiveStatusByCode] = useState(() => new Map())

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false

    const pollOnce = async () => {
      try {
        const result = await queryBoardStatusMap(heatPumpCountRef.current)
        if (!result || cancelled) {
          return
        }

        heatPumpCountRef.current = result.resolvedCount
        setLiveStatusByCode(result.statusByCode)
      } catch {
        // ignore
      }
    }

    pollOnce()
    const timerId = window.setInterval(pollOnce, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [enabled])

  return liveStatusByCode
}
