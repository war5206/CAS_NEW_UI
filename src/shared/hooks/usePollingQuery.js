import { useQuery } from '@tanstack/react-query'

export function usePollingQuery({
  queryKey,
  queryFn,
  enabled = true,
  refetchInterval = 10_000,
  staleTime = 5_000,
  select,
  retry = 1,
  ...options
}) {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    select,
    retry,
    staleTime,
    refetchInterval,
    refetchIntervalInBackground: true,
    ...options,
  })

  return {
    ...query,
    isFallbackData: Boolean(query.error && query.data),
    lastSuccessAt: query.dataUpdatedAt || null,
  }
}
