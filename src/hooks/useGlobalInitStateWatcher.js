import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { isInitGateSkipped } from '@/api/client/config'
import { getStoredToken } from '@/api/client/auth'
import { queryInitState } from '@/api/modules/home'
import { restoreOriginal } from '@/api/modules/settings'

const POLL_INTERVAL_MS = 30_000

/**
 * 全局轮询 queryInitState，监控设备锁状态与初始化状态。
 *
 * 行为说明：
 * - hasToken 为 false 时不轮询（尚未登录/未持有令牌）。
 * - 当前路径在 /auth/* 下时不触发跳转，避免打断登录/解锁流程。
 * - lockStatus === '1' 时跳转到 /auth/login。
 * - lockStatus 正常 + 系统曾经初始化完成（见过 initState === '1'）后，再次出现 initState === '0'：
 *   认为是后端发生了外部重置/异常，调用 restoreOriginal 后跳转到设置密码页。
 * - 通过 dataUpdatedAt 判断是否“真的拿到了新一次成功响应”，避免依赖项变化时拿旧缓存重复跳转。
 *
 * 用户主动“恢复出厂设置”时，请在跳转前调用 notifyFactoryResetTriggered()，
 * 防止 watcher 把用户在向导阶段（initState 仍为 '0'）再次回退到设置密码页。
 */

let hasSeenInitDone = false
let restoreTriggered = false
let restoreInFlight = false

/**
 * 标记本次 initState=0 是用户主动触发的恢复出厂，
 * 抑制 watcher 直到下次见到 initState=1（即系统重新完成初始化）。
 */
export function notifyFactoryResetTriggered() {
  hasSeenInitDone = false
  restoreTriggered = true
}

export function useGlobalInitStateWatcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const hasToken = Boolean(getStoredToken())
  const skipInitGate = isInitGateSkipped()
  const isOnAuthRoute = location.pathname.startsWith('/auth')

  const query = useQuery({
    queryKey: ['global-init-state'],
    queryFn: queryInitState,
    enabled: hasToken && !skipInitGate,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  })

  const lastSeenUpdateRef = useRef(0)

  useEffect(() => {
    if (!hasToken) return
    if (isOnAuthRoute) return
    if (!query.dataUpdatedAt) return
    if (query.dataUpdatedAt <= lastSeenUpdateRef.current) return
    lastSeenUpdateRef.current = query.dataUpdatedAt

    const body = query.data?.data
    if (!body?.success || body.code !== 200) return

    const lockStatus = String(body.data?.lockStatus ?? '')
    if (lockStatus === '1') {
      navigate('/auth/login', { replace: true, state: { deviceLocked: true } })
      return
    }

    const initState = String(body.data?.initState ?? '')
    if (initState === '1') {
      hasSeenInitDone = true
      restoreTriggered = false
      return
    }
    if (initState !== '0') return
    if (!hasSeenInitDone) return
    if (restoreTriggered || restoreInFlight) return

    restoreInFlight = true
    void restoreOriginal()
      .catch(() => {})
      .finally(() => {
        restoreInFlight = false
      })
    restoreTriggered = true
    navigate('/auth/set-password', { replace: true })
  }, [query.dataUpdatedAt, query.data, hasToken, isOnAuthRoute, navigate])
}
