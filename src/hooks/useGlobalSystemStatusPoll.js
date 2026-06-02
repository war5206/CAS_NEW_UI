import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStoredToken } from '@/api/client/auth'
import { queryRealvalByLongNames } from '@/api/modules/settings'
import { extractRealvalMap } from '@/utils/realvalMap'
import { setSystemPowerStatus } from '@/features/system/store/systemStatusStore'

const POLL_INTERVAL_MS = 10_000
const SYSTEM_STATUS_LONG_NAME = 'Sys\\FinforWorx\\SystemStatus'

/**
 * 写下置后到 PLC 点位生效之间的"压制窗口"：在该时间点之前到达的轮询响应不会
 * 覆盖前端的乐观状态。模块级共享，便于在 CasLayout 等页面写下置成功后调用
 * `suppressSystemStatusPollFor` 立刻接管。
 */
let suppressApplyUntilTs = 0

export function suppressSystemStatusPollFor(durationMs = 3000) {
  const target = Date.now() + Math.max(0, Number(durationMs) || 0)
  if (target > suppressApplyUntilTs) {
    suppressApplyUntilTs = target
  }
}

/**
 * 全局每 10s 轮询 queryRealvalByLongNames，获取 Sys\FinforWorx\SystemStatus 的值，
 * 并写入 systemStatusStore，供一键开关机按钮订阅使用。
 *
 * 仅在持有 token 时启用。
 */
export function useGlobalSystemStatusPoll() {
  const hasToken = Boolean(getStoredToken())
  const lastSeenUpdateRef = useRef(0)

  const query = useQuery({
    queryKey: ['global-system-status'],
    queryFn: () => queryRealvalByLongNames(SYSTEM_STATUS_LONG_NAME),
    enabled: hasToken,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!hasToken) return
    if (!query.dataUpdatedAt) return
    if (query.dataUpdatedAt <= lastSeenUpdateRef.current) return
    lastSeenUpdateRef.current = query.dataUpdatedAt

    // 写下置后短时间内的轮询响应可能仍是旧值（PLC 点位尚未生效），
    // 直接跳过 apply 以保留乐观更新。lastSeenUpdateRef 已更新，下一拍恢复正常。
    if (Date.now() < suppressApplyUntilTs) return

    const valueMap = extractRealvalMap(query.data)
    if (!valueMap) return
    const raw = valueMap[SYSTEM_STATUS_LONG_NAME]
    if (raw == null) return
    setSystemPowerStatus(raw)
  }, [query.dataUpdatedAt, query.data, hasToken])
}
