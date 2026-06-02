import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import {
  buildAllHomeUnitStatusLongNames,
  HOME_UNIT_STATUS_GROUPS,
} from '@/config/heatPumpUnitStatusPoints'
import {
  buildHomeUnitStatusPresentation,
  buildUnitStatusChartData,
  EMPTY_UNIT_STATUS_SUMMARY,
} from '@/utils/heatPumpUnitStatusSummary'
import { extractRealvalMap } from '@/utils/realvalMap'

const POLL_INTERVAL_MS = 10_000

const DEFAULT_PRESENTATION = {
  summary: { ...EMPTY_UNIT_STATUS_SUMMARY },
  chartData: buildUnitStatusChartData(EMPTY_UNIT_STATUS_SUMMARY),
}

function createDefaultHomeUnitStatusState() {
  return {
    heatPump: { ...DEFAULT_PRESENTATION },
    airCooledModule: { ...DEFAULT_PRESENTATION },
  }
}

/**
 * 首页轮询热泵/风冷模块运行状态（No1-13、No31-42）。
 */
export function useHomeUnitStatusPoll({ enabled = true } = {}) {
  const lastSuccessRef = useRef(createDefaultHomeUnitStatusState())
  const [unitStatus, setUnitStatus] = useState(() => lastSuccessRef.current)
  const [isInitialAttemptDone, setIsInitialAttemptDone] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    let firstRun = true
    const longNames = buildAllHomeUnitStatusLongNames()

    const run = async () => {
      try {
        const response = await queryRealvalByLongNames(longNames)
        const valueMap = extractRealvalMap(response)
        if (!valueMap || cancelled) {
          return
        }

        const nextState = {
          heatPump: buildHomeUnitStatusPresentation(valueMap, HOME_UNIT_STATUS_GROUPS.heatPump),
          airCooledModule: buildHomeUnitStatusPresentation(valueMap, HOME_UNIT_STATUS_GROUPS.airCooledModule),
        }
        lastSuccessRef.current = nextState
        setUnitStatus(nextState)
      } catch {
        // 保留上次成功值
      } finally {
        if (!cancelled && firstRun) {
          setIsInitialAttemptDone(true)
          firstRun = false
        }
      }
    }

    run()
    const timerId = window.setInterval(run, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [enabled])

  return {
    heatPump: unitStatus.heatPump,
    airCooledModule: unitStatus.airCooledModule,
    isInitialAttemptDone,
  }
}
