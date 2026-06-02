import { useSyncExternalStore } from 'react'

const listeners = new Set()

let state = {
  /** Sys\FinforWorx\SystemStatus 原始字符串值（'1' 表示开机，'0' 表示关机） */
  powerStatus: '0',
  /** 是否已经成功获取过一次后端值 */
  hasFetched: false,
  /** 是否正在下置 SystemStatus */
  isToggling: false,
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useSystemStatusStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * 由全局轮询调用：写入最新的 SystemStatus。
 * @param {string} value - '0' 或 '1'
 */
export function setSystemPowerStatus(value) {
  const next = String(value) === '1' ? '1' : '0'
  if (state.powerStatus === next && state.hasFetched) {
    return
  }
  state = {
    ...state,
    powerStatus: next,
    hasFetched: true,
  }
  emitChange()
}

export function setSystemPowerToggling(isToggling) {
  if (state.isToggling === Boolean(isToggling)) {
    return
  }
  state = {
    ...state,
    isToggling: Boolean(isToggling),
  }
  emitChange()
}
