import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptScreenData, createDefaultScreenData } from '@/api/adapters/screen'
import { queryScreenData } from '@/api/modules/home'

export const useScreenDataQuery = createDataQuery({
  queryKey: ['screen-data'],
  queryFn: queryScreenData,
  select: (response) => adaptScreenData(response?.data ?? response),
  createDefaultData: createDefaultScreenData,
})
