import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStoredToken } from '@/api/client/auth'
import { adaptSystemConfig } from '@/api/adapters/home'
import { querySystemConfigWithCouplingEnergy } from '@/api/modules/home'
import { resetSystemConfigState, setSystemConfigState } from '@/features/system/store/systemConfigStore'

const POLL_INTERVAL_MS = 60_000

/**
 * 全局轮询 querySystemConfig，并将 systemTypeUuid 等信息写入 systemConfigStore。
 * 供多模块统一控制“末端循环泵”等系统类型相关展示逻辑。
 */
export function useGlobalSystemConfigPoll() {
  const hasToken = Boolean(getStoredToken())
  const lastSeenUpdateRef = useRef(0)

  const query = useQuery({
    queryKey: ['system-config'],
    queryFn: querySystemConfigWithCouplingEnergy,
    enabled: hasToken,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    select: (response) => adaptSystemConfig(response?.data ?? response),
  })

  useEffect(() => {
    if (hasToken) {
      return
    }
    resetSystemConfigState()
  }, [hasToken])

  useEffect(() => {
    if (!hasToken) return
    if (!query.dataUpdatedAt) return
    if (query.dataUpdatedAt <= lastSeenUpdateRef.current) return
    lastSeenUpdateRef.current = query.dataUpdatedAt
    if (!query.data) return
    setSystemConfigState(query.data)
  }, [query.dataUpdatedAt, query.data, hasToken])
}
