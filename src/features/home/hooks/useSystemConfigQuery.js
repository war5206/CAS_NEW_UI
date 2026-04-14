import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adaptSystemConfig, createDefaultSystemConfig } from '@/api/adapters/home'
import { querySystemConfig } from '@/api/modules/home'

export function useSystemConfigQuery({ enabled = true } = {}) {
  const lastSuccessRef = useRef(null)

  const query = useQuery({
    queryKey: ['system-config'],
    queryFn: querySystemConfig,
    select: (response) => adaptSystemConfig(response?.data ?? response),
    enabled,
    retry: 2,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  if (query.data) {
    lastSuccessRef.current = query.data
  }

  const data = query.data ?? lastSuccessRef.current ?? createDefaultSystemConfig()

  return {
    ...query,
    data,
  }
}
