import { useRef } from 'react'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import {
  adaptAnalysisProjectContextFromRealvalMap,
  ANALYSIS_CONTEXT_LONG_NAMES,
  createDefaultAnalysisProjectContext,
} from '@/config/analysisProjectContext'
import { usePollingQuery } from '@/shared/hooks/usePollingQuery'
import { extractRealvalMap } from '@/utils/realvalMap'

export function useAnalysisProjectContextQuery({ enabled = true } = {}) {
  const lastSuccessRef = useRef(null)

  const query = usePollingQuery({
    queryKey: ['analysis', 'project-context'],
    queryFn: async () => {
      const response = await queryRealvalByLongNames(ANALYSIS_CONTEXT_LONG_NAMES)
      const valueMap = extractRealvalMap(response)
      return adaptAnalysisProjectContextFromRealvalMap(valueMap)
    },
    enabled,
    refetchInterval: false,
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  return {
    ...query,
    data: query.data ?? lastSuccessRef.current ?? createDefaultAnalysisProjectContext(),
  }
}
