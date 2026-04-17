import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  adaptAlarmCategory,
  adaptAlarmDistribution,
  adaptAlarmOverview,
  adaptAlarmTrend,
  adaptHeatPumpSelectOptions,
  createDefaultAlarmCategory,
  createDefaultAlarmDistribution,
  createDefaultAlarmOverview,
  createDefaultAlarmTrend,
  createDefaultHeatPumpSelectOptions,
} from '@/api/adapters/alerts'
import {
  giveAlarmDeviceDistribution,
  giveAlarmHeatPumpDistribution,
  giveAlarmHeatPumpNumber,
  giveAlarmOverview,
  giveAlarmSystemDistribution,
  giveAlarmTrend,
  queryHeatPumpSelect,
} from '@/api/modules/home'

function useQueryWithFallback({ createDefaultData, ...queryOptions }) {
  const lastSuccessRef = useRef(null)
  const query = useQuery({
    staleTime: 5_000,
    retry: 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    ...queryOptions,
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  return {
    ...query,
    data: query.data ?? lastSuccessRef.current ?? createDefaultData(),
  }
}

export function useAlarmOverviewQuery({ params, enabled = true } = {}) {
  return useQueryWithFallback({
    queryKey: ['alarm-analysis-overview', params],
    queryFn: () => giveAlarmOverview(params),
    select: (response) => adaptAlarmOverview(response?.data ?? response),
    enabled,
    createDefaultData: createDefaultAlarmOverview,
  })
}

export function useAlarmTrendQuery({ params, enabled = true } = {}) {
  return useQueryWithFallback({
    queryKey: ['alarm-analysis-trend', params],
    queryFn: () => giveAlarmTrend(params),
    select: (response) => adaptAlarmTrend(response?.data ?? response),
    enabled,
    createDefaultData: createDefaultAlarmTrend,
  })
}

export function useAlarmCategoryQuery({ params, enabled = true } = {}) {
  return useQueryWithFallback({
    queryKey: ['alarm-analysis-category', params],
    queryFn: () => giveAlarmHeatPumpNumber(params),
    select: (response) => adaptAlarmCategory(response?.data ?? response),
    enabled,
    createDefaultData: createDefaultAlarmCategory,
  })
}

export function useAlarmDistributionQuery({ scope, params, enabled = true } = {}) {
  const queryFnMap = {
    'heat-pump': () => giveAlarmHeatPumpDistribution(params),
    system: () => giveAlarmSystemDistribution(params),
    device: () => giveAlarmDeviceDistribution(params),
  }

  return useQueryWithFallback({
    queryKey: ['alarm-analysis-distribution', scope, params],
    queryFn: queryFnMap[scope] ?? queryFnMap.device,
    select: (response) => adaptAlarmDistribution(response?.data ?? response),
    enabled,
    createDefaultData: createDefaultAlarmDistribution,
  })
}

export function useHeatPumpSelectOptionsQuery({ enabled = true } = {}) {
  return useQueryWithFallback({
    queryKey: ['alarm-analysis-heat-pump-select'],
    queryFn: queryHeatPumpSelect,
    select: (response) => adaptHeatPumpSelectOptions(response?.data ?? response),
    enabled,
    createDefaultData: createDefaultHeatPumpSelectOptions,
  })
}
