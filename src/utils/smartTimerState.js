const SMART_TIMER_PAGE_MODE_KEY = 'cas_smart_timer_page_mode'
const LEGACY_SMART_TIMER_SWITCH_KEY = 'cas_smart_timer_switch'

// 智能定时开关与定时页模式共用同一份状态：开 = 智能定时模式，关 = 全天候模式
export function getStoredSmartTimerPageMode() {
  if (typeof window === 'undefined') {
    return 'smart'
  }

  const value = window.localStorage.getItem(SMART_TIMER_PAGE_MODE_KEY)
  if (value != null) {
    return value === 'all-day' ? 'all-day' : 'smart'
  }

  // 兼容旧版仅存的开关 key
  const legacySwitch = window.localStorage.getItem(LEGACY_SMART_TIMER_SWITCH_KEY)
  return legacySwitch === 'off' ? 'all-day' : 'smart'
}

export function setStoredSmartTimerPageMode(mode) {
  if (typeof window === 'undefined') {
    return
  }

  const nextMode = mode === 'all-day' ? 'all-day' : 'smart'
  window.localStorage.setItem(SMART_TIMER_PAGE_MODE_KEY, nextMode)
  window.localStorage.removeItem(LEGACY_SMART_TIMER_SWITCH_KEY)
}

export function getStoredSmartTimerSwitch() {
  return getStoredSmartTimerPageMode() === 'smart'
}

export function setStoredSmartTimerSwitch(enabled) {
  setStoredSmartTimerPageMode(enabled ? 'smart' : 'all-day')
}
