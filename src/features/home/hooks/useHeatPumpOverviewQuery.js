import { useQuery } from '@tanstack/react-query'
import { adaptHeatPumpOverviewPage, createDefaultHeatPumpOverviewPage } from '@/api/adapters/home'
import { queryAllHeatPumpParam } from '@/api/modules/home'

export function useHeatPumpOverviewQuery({ pageNum = 1, enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['home-heat-pump-overview', pageNum],
    enabled: Boolean(enabled),
    queryFn: () => queryAllHeatPumpParam({ pageNum }),
    select: (response) => adaptHeatPumpOverviewPage(response?.data ?? response),
    placeholderData: (previousData) => previousData,
    staleTime: 5_000,
    retry: 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })

  return {
    ...query,
    data: query.data ?? createDefaultHeatPumpOverviewPage(),
  }
}
