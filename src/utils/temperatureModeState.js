const TEMPERATURE_MODE_KEY = 'cas_temperature_mode'

export function getStoredTemperatureMode() {
  if (typeof window === 'undefined') {
    return 'heating'
  }

  const value = window.localStorage.getItem(TEMPERATURE_MODE_KEY)
  return value === 'cooling' ? 'cooling' : 'heating'
}

export function setStoredTemperatureMode(mode) {
  if (typeof window === 'undefined') {
    return
  }

  const nextMode = mode === 'cooling' ? 'cooling' : 'heating'
  window.localStorage.setItem(TEMPERATURE_MODE_KEY, nextMode)
}
