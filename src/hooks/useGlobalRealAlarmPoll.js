import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStoredToken } from '@/api/client/auth'
import { queryRealAlarm } from '@/api/modules/home'
import { setLiveAlarms } from '@/features/alerts/store/alertsStore'

const POLL_INTERVAL_MS = 30_000
const NO_ALARM_MESSAGE = '没有更多报警数据'

function adaptIndicatorRow(item = {}, index = 0) {
  const id = item.alarmid != null ? String(item.alarmid) : `realtime-${index}`
  const description = item.alarm_description ? String(item.alarm_description) : ''
  return {
    id,
    alarmName: description || '--',
    alarmDescription: description,
  }
}

/**
 * 全局每 30s 轮询 queryRealAlarm 拉取实时报警，结果写入 alertsStore：
 * - data.message === '没有更多报警数据'：表示无报警
 * - data.total > 0：表示有报警，store 中保留全部 realAlarm 行（消费方按需取最近 N 条）
 *
 * 仅在持有 token 时启用。
 */
export function useGlobalRealAlarmPoll() {
  const hasToken = Boolean(getStoredToken())
  const lastSeenUpdateRef = useRef(0)

  const query = useQuery({
    queryKey: ['global-real-alarm'],
    queryFn: () => queryRealAlarm({ current: 1, name: '', grade: '' }),
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

    const payload = query.data?.data?.data ?? query.data?.data ?? null
    if (!payload || typeof payload !== 'object') return

    const message = payload.message ? String(payload.message) : ''
    const total = Number(payload.total) || 0
    const list = Array.isArray(payload.realAlarm) ? payload.realAlarm : []
    const isEmpty = message === NO_ALARM_MESSAGE || total === 0
    const rows = isEmpty ? [] : list.map(adaptIndicatorRow)

    setLiveAlarms({ rows, total: isEmpty ? 0 : total, message })
  }, [query.dataUpdatedAt, query.data, hasToken])
}
