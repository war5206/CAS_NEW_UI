import { useEffect, useRef, useState } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import {
  buildHomeUnitStatusPollLongNames,
  getHomeUnitStatusGroups,
} from '@/config/heatPumpUnitStatusPoints'
import { resolveHeatPumpCountFromValueMap } from '@/config/projectUnitDevices'
import { STANDARD_DEFAULT_HEAT_PUMP_COUNT } from '@/config/projectProfile'
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

async function queryHomeUnitStatusState(heatPumpCount) {
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

  const statusGroups = getHomeUnitStatusGroups({ heatPumpCount: resolvedCount })
  const nextState = {
    heatPump: buildHomeUnitStatusPresentation(valueMap, statusGroups.heatPump),
  }
  if (statusGroups.airCooledModule) {
    nextState.airCooledModule = buildHomeUnitStatusPresentation(valueMap, statusGroups.airCooledModule)
  }

  return { nextState, resolvedCount }
}

/**
 * 首页轮询热泵/风冷模块运行状态。
 * 标准款热泵台数来自 Sys\FinforWorx\HPTotalNumber；大剧院固定 No1-13、No31-42。
 */
export function useHomeUnitStatusPoll({ enabled = true } = {}) {
  const heatPumpCountRef = useRef(STANDARD_DEFAULT_HEAT_PUMP_COUNT)
  const lastSuccessRef = useRef(createDefaultHomeUnitStatusState())
  const [unitStatus, setUnitStatus] = useState(() => lastSuccessRef.current)
  const [isInitialAttemptDone, setIsInitialAttemptDone] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let cancelled = false
    let firstRun = true

    const run = async () => {
      try {
        const result = await queryHomeUnitStatusState(heatPumpCountRef.current)
        if (!result || cancelled) {
          return
        }

        heatPumpCountRef.current = result.resolvedCount
        const nextState = {
          ...result.nextState,
          airCooledModule: result.nextState.airCooledModule ?? lastSuccessRef.current.airCooledModule,
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
