import { useSyncExternalStore } from 'react'

const METER_CONFIG_STORAGE_KEY = 'operations.meter.config'

/**
 * 表计数量配置：各组表计展示多少个卡片。
 * 上下限受后端脚本支持范围约束（querySystemConfigSingle.groovy）：
 * 电表 No1-No10、热表 No1-No3、水表仅 No1，超出后卡片查不到数据。
 */
export const DEFAULT_METER_CONFIG = {
  heatPumpMeterCount: 10,
  waterPumpMeterCount: 10,
  couplingMeterCount: 10,
  heatMeterCount: 3,
  waterMeterCount: 1,
}

const METER_COUNT_LIMITS = {
  heatPumpMeterCount: { min: 0, max: 10 },
  waterPumpMeterCount: { min: 0, max: 10 },
  couplingMeterCount: { min: 0, max: 10 },
  heatMeterCount: { min: 0, max: 3 },
  waterMeterCount: { min: 0, max: 1 },
}

const listeners = new Set()

function clampCount(key, value) {
  const { min, max } = METER_COUNT_LIMITS[key]
  const number = Math.round(Number(value))
  if (!Number.isFinite(number)) {
    return DEFAULT_METER_CONFIG[key]
  }
  return Math.min(max, Math.max(min, number))
}

function normalizeConfig(input) {
  const source = input && typeof input === 'object' ? input : {}
  return Object.fromEntries(
    Object.keys(DEFAULT_METER_CONFIG).map((key) => [key, clampCount(key, source[key])]),
  )
}

function readConfig() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_METER_CONFIG }
  }
  try {
    const raw = window.localStorage.getItem(METER_CONFIG_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_METER_CONFIG }
    }
    return normalizeConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_METER_CONFIG }
  }
}

let state = readConfig()

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

function persistConfig(nextState) {
  state = normalizeConfig(nextState)
  try {
    window.localStorage.setItem(METER_CONFIG_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage write errors
  }
  emitChange()
}

export function useMeterConfig() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function setMeterConfig(patch) {
  persistConfig({ ...state, ...patch })
}

export function resetMeterConfig() {
  persistConfig({ ...DEFAULT_METER_CONFIG })
}
