const TEMPERATURE_MODE_KEY = 'cas_temperature_mode'

export const CONSTANT_SET_TEMP_LONG_NAME_HEATING = 'Sys\\FinforWorx\\SetTemperature1'
export const CONSTANT_SET_TEMP_LONG_NAME_COOLING = 'Sys\\FinforWorx\\SetTemperature2'

export function getConstantSetTempLongName(mode) {
  return mode === 'cooling' ? CONSTANT_SET_TEMP_LONG_NAME_COOLING : CONSTANT_SET_TEMP_LONG_NAME_HEATING
}

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
