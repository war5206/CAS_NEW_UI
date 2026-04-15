import { useQuery } from '@tanstack/react-query'
import { adaptHeatPumpArrange } from '@/api/adapters/home'
import { queryHeatPumpArrange } from '@/api/modules/home'

export function useHeatPumpArrangeQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['home-heat-pump-arrange'],
    queryFn: queryHeatPumpArrange,
    select: (response) => adaptHeatPumpArrange(response?.data ?? response),
    enabled,
    staleTime: 5_000,
    retry: 1,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
}
