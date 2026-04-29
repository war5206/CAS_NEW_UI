import { useQuery } from '@tanstack/react-query'
import { usePollingQuery } from '@/shared/hooks/usePollingQuery'
import {
  adaptOpsCurveData,
  adaptOpsDeviceRows,
  adaptOpsHeatPumpOptions,
  adaptOpsHeatPumpSingleMetrics,
  adaptOpsSystemConfigMetrics,
  adaptOpsSystemStateMetrics,
  adaptOpsSystemType,
  createDefaultOpsCurveData,
  createDefaultOpsDeviceRows,
  createDefaultOpsHeatPumpOptions,
  createDefaultOpsHeatPumpSingleMetrics,
  createDefaultOpsSystemConfigMetrics,
  createDefaultOpsSystemStateMetrics,
  createDefaultOpsSystemType,
} from '@/api/adapters/operations'
import {
  heatPumpOperatingTime,
  queryCurveByLongName,
  queryHeatPumpList,
  queryHeatPumpSingle,
  querySystemConfigSingle,
  querySystemStateData,
  querySystemType,
} from '@/api/modules/operations'

export function useOpsSystemStateQuery({ enabled = true } = {}) {
  return usePollingQuery({
    queryKey: ['ops', 'system-state'],
    queryFn: querySystemStateData,
    enabled,
    select: (response) => adaptOpsSystemStateMetrics(response?.data ?? response),
    placeholderData: createDefaultOpsSystemStateMetrics(),
  })
}

export function useOpsHeatPumpListQuery({ enabled = true } = {}) {
  return usePollingQuery({
    queryKey: ['ops', 'heat-pump-list'],
    queryFn: queryHeatPumpList,
    enabled,
    select: (response) => adaptOpsHeatPumpOptions(response?.data ?? response),
    placeholderData: createDefaultOpsHeatPumpOptions(),
  })
}

export function useOpsHeatPumpSingleQuery(code, { enabled = true } = {}) {
  return usePollingQuery({
    queryKey: ['ops', 'heat-pump-single', code],
    queryFn: () => queryHeatPumpSingle(code),
    enabled: enabled && Boolean(code),
    select: (response) => adaptOpsHeatPumpSingleMetrics(response?.data ?? response),
    placeholderData: createDefaultOpsHeatPumpSingleMetrics(),
  })
}

export function useOpsSystemConfigQuery(code, { enabled = true } = {}) {
  return usePollingQuery({
    queryKey: ['ops', 'system-config-single', code],
    queryFn: () => querySystemConfigSingle(code),
    enabled: enabled && Boolean(code),
    select: (response) => adaptOpsSystemConfigMetrics(response?.data ?? response),
    placeholderData: createDefaultOpsSystemConfigMetrics(),
  })
}

export function useOpsCurveQuery({ longName, startTime, endTime, enabled = true }) {
  return useQuery({
    queryKey: ['ops', 'curve', longName, startTime, endTime],
    queryFn: () =>
      queryCurveByLongName({
        longName,
        start_time: startTime,
        end_time: endTime,
      }),
    enabled: enabled && Boolean(longName) && Boolean(startTime) && Boolean(endTime),
    refetchOnWindowFocus: false,
    retry: 1,
    select: (response) => adaptOpsCurveData(response?.data ?? response),
    placeholderData: createDefaultOpsCurveData(),
  })
}

export function useOpsSystemTypeQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['ops', 'system-type'],
    queryFn: querySystemType,
    enabled,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (response) => adaptOpsSystemType(response?.data ?? response),
    placeholderData: createDefaultOpsSystemType(),
  })
}

export function useOpsOperatingTimeQuery(type, { enabled = true } = {}) {
  return usePollingQuery({
    queryKey: ['ops', 'operating-time', type],
    queryFn: () => heatPumpOperatingTime(type),
    enabled: enabled && Boolean(type),
    select: (response) => adaptOpsDeviceRows(response?.data ?? response),
    placeholderData: createDefaultOpsDeviceRows(),
  })
}
