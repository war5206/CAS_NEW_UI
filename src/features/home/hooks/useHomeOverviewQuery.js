import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptHomeOverview, createDefaultHomeOverview } from '@/api/adapters/home'
import { getHomeOverview } from '@/api/modules/home'

export const useHomeOverviewQuery = createDataQuery({
  queryKey: ['home-overview'],
  queryFn: getHomeOverview,
  select: (response) => adaptHomeOverview(response?.data ?? response),
  createDefaultData: createDefaultHomeOverview,
})
