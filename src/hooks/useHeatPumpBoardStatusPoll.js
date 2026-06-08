import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import { getUnitDeviceStatusLongNames } from '@/config/unitDeviceParamPoints'
import { FIXED_UNIT_DEVICE_IDS, toUnitDeviceCode } from '@/config/projectUnitDevices'
import { extractRealvalMap } from '@/utils/realvalMap'
import { resolveRuntimeStatusFromPoints } from '@/utils/heatPumpRuntimeStatus'

const POLL_INTERVAL_MS = 10_000

function buildStatusLongNames() {
  const longNames = []
  FIXED_UNIT_DEVICE_IDS.forEach((pointNo) => {
    const statusLongNames = getUnitDeviceStatusLongNames(pointNo)
    longNames.push(statusLongNames.operation, statusLongNames.defrosting, statusLongNames.fault, statusLongNames.commStatus)
  })
  return longNames
}

function buildStatusMapFromValueMap(valueMap) {
  const statusByCode = new Map()

  FIXED_UNIT_DEVICE_IDS.forEach((pointNo) => {
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

/**
 * 热泵总览网格：轮询 Machine_Operation / Systematic_Defrosting / Fault_Alarm 实时状态。
 */
export function useHeatPumpBoardStatusPoll({ enabled = true } = {}) {
  const lastSuccessRef = useRef(new Map())
  const [statusByCode, setStatusByCode] = useState(() => lastSuccessRef.current)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    const longNames = buildStatusLongNames()

    const run = async () => {
      try {
        const response = await queryRealvalByLongNames(longNames)
        const valueMap = extractRealvalMap(response)
        if (!valueMap || cancelled) {
          return
        }

        const nextStatusByCode = buildStatusMapFromValueMap(valueMap)
        lastSuccessRef.current = nextStatusByCode
        setStatusByCode(nextStatusByCode)
      } catch {
        // 保留上次成功值
      }
    }

    run()
    const timerId = window.setInterval(run, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [enabled])

  return statusByCode
}
