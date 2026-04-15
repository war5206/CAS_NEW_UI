import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptHomeTemperatureTrend, createDefaultHomeTemperatureTrend } from '@/api/adapters/home'
import { queryTemp24Hour } from '@/api/modules/home'

function getMsUntilNextHour() {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setMinutes(0, 0, 0)
  nextHour.setHours(nextHour.getHours() + 1)
  return Math.max(nextHour.getTime() - now.getTime(), 1_000)
}

export const useTemp24HourQuery = createDataQuery({
  queryKey: ['home-temperature-24hour'],
  queryFn: queryTemp24Hour,
  select: (response) => adaptHomeTemperatureTrend(response?.data ?? response),
  createDefaultData: createDefaultHomeTemperatureTrend,
  // 首次进入立即请求，后续按“下一个整点”轮询，每小时一次
  refetchInterval: () => getMsUntilNextHour(),
})
