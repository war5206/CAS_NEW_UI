import { getUnitStatusPointLongNames } from '@/config/heatPumpUnitStatusPoints'
import { isOnValue } from '@/utils/realvalMap'
import { hasRuntimeFault } from '@/utils/heatPumpRuntimeStatus'

export const EMPTY_UNIT_STATUS_SUMMARY = {
  running: 0,
  shutdown: 0,
  defrosting: 0,
  malfunction: 0,
}

export function summarizeUnitRange(valueMap, { startNo, count }) {
  if (!valueMap || typeof valueMap !== 'object') {
    return { ...EMPTY_UNIT_STATUS_SUMMARY }
  }

  const summary = { ...EMPTY_UNIT_STATUS_SUMMARY }

  for (let index = 0; index < count; index += 1) {
    const pointNo = startNo + index
    const longNames = getUnitStatusPointLongNames(pointNo)
    const isRunning = isOnValue(valueMap[longNames.operation])
    const isDefrosting = isOnValue(valueMap[longNames.defrosting])
    const isFault = hasRuntimeFault({
      faultAlarm: valueMap[longNames.fault],
      commStatus: valueMap[longNames.commStatus],
      includeCommStatus: true,
    })

    if (isRunning) {
      summary.running += 1
    } else {
      summary.shutdown += 1
    }

    if (isDefrosting) {
      summary.defrosting += 1
    }

    if (isFault) {
      summary.malfunction += 1
    }
  }

  return summary
}

export function buildUnitStatusChartData(summary = EMPTY_UNIT_STATUS_SUMMARY) {
  return [
    { name: '运行', value: summary.running, color: ['#3B9EFF', '#1F5FB8'] },
    { name: '待机', value: summary.shutdown, color: ['#9FAABD', '#69778E'] },
    { name: '化霜', value: summary.defrosting, color: ['#F4CE52', '#A77A1F'] },
    { name: '故障', value: summary.malfunction, color: ['#FF671E', '#A93600'] },
  ]
}

export function buildHomeUnitStatusPresentation(valueMap, group) {
  const summary = summarizeUnitRange(valueMap, group)
  return {
    summary,
    chartData: buildUnitStatusChartData(summary),
  }
}
