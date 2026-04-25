import { useCallback, useEffect, useRef } from 'react'

/** 下置成功后默认延迟回读时间（给后端点位生效留时间） */
export const DEFAULT_WRITE_VERIFY_DELAY_MS = 3000

/**
 * 统一判断下置是否成功：接口 body 的 `data.state === 'success'`
 * @param {unknown} response - axios 响应，body 在 `response.data`
 * @returns {boolean}
 */
export function isWriteSuccess(response) {
  const payload = response?.data
  if (!payload || typeof payload !== 'object') return false
  const data = payload.data
  if (data == null || typeof data !== 'object') return false
  return data.state === 'success'
}

/**
 * 下置成功后延迟回读，用于在各页面用服务端数据校正乐观更新。
 * 在组件卸载时清除挂起的回读定时器，避免闭包内更新已卸载的组件。
 *
 * @param {object} options
 * @param {(data: Record<string, unknown>) => Promise<unknown>} options.write
 *        下置函数，如 `writeRealvalByLongNames`。
 * @param {(response: unknown) => boolean} [options.isWriteSuccess] 成功判定，默认以 `data.state === 'success'` 判断。
 * @param {number} [options.verifyDelayMs] 回读延迟毫秒，默认 `DEFAULT_WRITE_VERIFY_DELAY_MS`。
 * @param {(message: string) => void} [options.onNotify] 成功/失败时提示（仅在组件仍挂载时调用）。
 * @returns {{
 *   performWrite: (writeData: Record<string, unknown>, opts?: {
 *     optimisticApply?: () => void,
 *     delayedVerify?: () => void | Promise<void>,
 *     successMessage?: string,
 *     errorMessage?: string
 *   }) => Promise<boolean>,
 *   scheduleVerify: (verifyFn: () => void | Promise<void>) => void,
 *   isMountedRef: React.MutableRefObject<boolean>
 * }}
 */
export function useWriteWithDelayedVerify({
  write,
  isWriteSuccess: isWriteSuccessFn = isWriteSuccess,
  verifyDelayMs = DEFAULT_WRITE_VERIFY_DELAY_MS,
  onNotify,
}) {
  const isMountedRef = useRef(true)
  const verifyTimersRef = useRef(new Set())

  useEffect(() => {
    isMountedRef.current = true
    const timers = verifyTimersRef.current
    return () => {
      isMountedRef.current = false
      timers.forEach((id) => window.clearTimeout(id))
      timers.clear()
    }
  }, [])

  const scheduleVerify = useCallback(
    (verifyFn) => {
      if (typeof verifyFn !== 'function') return
      const timerId = window.setTimeout(() => {
        verifyTimersRef.current.delete(timerId)
        if (!isMountedRef.current) return
        try {
          verifyFn()
        } catch {
          // ignore
        }
      }, verifyDelayMs)
      verifyTimersRef.current.add(timerId)
    },
    [verifyDelayMs],
  )

  const performWrite = useCallback(
    async (writeData, { optimisticApply, delayedVerify, successMessage, errorMessage } = {}) => {
      const successMsg = successMessage ?? '保存成功'
      const errMsg = errorMessage ?? '下置失败，请重试'
      try {
        const response = await write(writeData)
        if (isWriteSuccessFn(response)) {
          if (typeof optimisticApply === 'function' && isMountedRef.current) {
            optimisticApply()
          }
          if (isMountedRef.current) {
            onNotify?.(successMsg)
          }
          scheduleVerify(delayedVerify)
          return true
        }
        if (isMountedRef.current) {
          onNotify?.(errMsg)
        }
        return false
      } catch {
        if (isMountedRef.current) {
          onNotify?.(errMsg)
        }
        return false
      }
    },
    [write, isWriteSuccessFn, onNotify, scheduleVerify],
  )

  return { performWrite, scheduleVerify, isMountedRef }
}
