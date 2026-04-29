import { createDataQuery } from '@/shared/hooks/createDataQuery'
import { adaptSmartTimerPlans, createDefaultSmartTimerPlans } from '@/api/adapters/smartTimer'
import { querySmartTimerPlan } from '@/api/modules/smartTimer'

export const useSmartTimerPlansQuery = createDataQuery({
  queryKey: ['smart-timer-plans'],
  queryFn: () => querySmartTimerPlan({}),
  select: (response) => adaptSmartTimerPlans(response?.data ?? response),
  createDefaultData: createDefaultSmartTimerPlans,
  refetchInterval: 30_000,
})
