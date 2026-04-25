import { useRef } from 'react'
import { usePollingQuery } from './usePollingQuery'

export function createDataQuery({
  queryKey,
  queryFn,
  select,
  createDefaultData,
  refetchInterval = 10_000,
}) {
  return function useDataQuery({ enabled = true } = {}) {
    const lastSuccessRef = useRef(null)

    const query = usePollingQuery({
      queryKey,
      queryFn,
      select,
      refetchInterval,
      enabled,
    })

    if (query.data) {
      lastSuccessRef.current = query.data
    }

    const hasFetchedData = Boolean(query.data ?? lastSuccessRef.current)
    const data = query.data ?? lastSuccessRef.current ?? createDefaultData()

    return {
      ...query,
      data,
      hasFetchedData,
    }
  }
}
