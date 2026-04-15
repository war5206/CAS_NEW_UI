import { useQuery } from '@tanstack/react-query'
import { adaptHeatPumpParam } from '@/api/adapters/home'
import { queryHeatPumpParam } from '@/api/modules/home'

export function useHeatPumpParamQuery({ pump, enabled = true } = {}) {
  return useQuery({
    queryKey: ['home-heat-pump-param', pump?.code, pump?.alarm, pump?.run, pump?.state],
    enabled: Boolean(enabled && pump?.code),
    queryFn: () =>
      queryHeatPumpParam({
        code: pump.code,
        alarm: Boolean(pump.alarm),
        run: Boolean(pump.run),
        state: pump.state ?? '',
      }),
    select: (response) => adaptHeatPumpParam(response?.data ?? response, pump),
    staleTime: 5_000,
    retry: 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
}
