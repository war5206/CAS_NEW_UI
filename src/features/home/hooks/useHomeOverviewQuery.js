import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptHomeOverview, createDefaultHomeOverview } from '@/api/adapters/home'
import { getHomeOverview } from '@/api/modules/home'

export const HOME_OVERVIEW_QUERY_KEY = ['home-overview']

export const useHomeOverviewQuery = createDataQuery({
  queryKey: HOME_OVERVIEW_QUERY_KEY,
  queryFn: getHomeOverview,
  select: (response) => adaptHomeOverview(response?.data ?? response),
  createDefaultData: createDefaultHomeOverview,
})
