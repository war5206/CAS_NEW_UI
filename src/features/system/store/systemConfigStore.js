import { useSyncExternalStore } from 'react'
import { createDefaultSystemConfig } from '@/api/adapters/home'

const listeners = new Set()

let state = {
  ...createDefaultSystemConfig(),
  /** 是否已成功获取过系统配置 */
  hasFetched: false,
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

export function useSystemConfigStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * 由全局 querySystemConfig 轮询写入。
 * @param {{ systemTypeUuid?: string, terminalTypeUuid?: string, coupleEnergyTypeUuid?: string }} nextConfig
 */
export function setSystemConfigState(nextConfig) {
  const systemTypeUuid = String(nextConfig?.systemTypeUuid ?? '1')
  const terminalTypeUuid = String(nextConfig?.terminalTypeUuid ?? '5')
  const coupleEnergyTypeUuid = String(nextConfig?.coupleEnergyTypeUuid ?? '')

  if (
    state.hasFetched &&
    state.systemTypeUuid === systemTypeUuid &&
    state.terminalTypeUuid === terminalTypeUuid &&
    state.coupleEnergyTypeUuid === coupleEnergyTypeUuid
  ) {
    return
  }

  state = {
    systemTypeUuid,
    terminalTypeUuid,
    coupleEnergyTypeUuid,
    hasFetched: true,
  }
  emitChange()
}

export function resetSystemConfigState() {
  state = {
    ...createDefaultSystemConfig(),
    hasFetched: false,
  }
  emitChange()
}
