const CLIMATE_MODE_KEY = 'cas_climate_mode'

export function getStoredClimateMode() {
  if (typeof window === 'undefined') {
    return 'climate'
  }

  const value = window.localStorage.getItem(CLIMATE_MODE_KEY)
  return value === 'constant' ? 'constant' : 'climate'
}

export function setStoredClimateMode(mode) {
  if (typeof window === 'undefined') {
    return
  }

  const nextMode = mode === 'constant' ? 'constant' : 'climate'
  window.localStorage.setItem(CLIMATE_MODE_KEY, nextMode)
}

