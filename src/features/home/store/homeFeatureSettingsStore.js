import { useSyncExternalStore } from 'react'

const HOME_FEATURE_SETTINGS_STORAGE_KEY = 'home.feature.settings'

const DEFAULT_HOME_FEATURE_SETTINGS = {
  showModeStatus: true,
  showModeSavedCost: true,
  showCostAnalysis: true,
  showTargetBackwaterTemperature: true,
  showDeviceStatus: true,
  indoorTemperatureVisibility: [true, true, true, true, true],
}

const listeners = new Set()

function createDefaultSettings() {
  return {
    ...DEFAULT_HOME_FEATURE_SETTINGS,
    indoorTemperatureVisibility: [...DEFAULT_HOME_FEATURE_SETTINGS.indoorTemperatureVisibility],
  }
}

function normalizeIndoorVisibility(value) {
  const source = Array.isArray(value) ? value : []
  const normalized = []
  for (let i = 0; i < 5; i += 1) {
    normalized.push(source[i] !== false)
  }
  return normalized
}

function normalizeSettings(input) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    showModeStatus: source.showModeStatus !== false,
    showModeSavedCost: source.showModeSavedCost !== false,
    showCostAnalysis: source.showCostAnalysis !== false,
    showTargetBackwaterTemperature: source.showTargetBackwaterTemperature !== false,
    showDeviceStatus: source.showDeviceStatus !== false,
    indoorTemperatureVisibility: normalizeIndoorVisibility(source.indoorTemperatureVisibility),
  }
}

function isElectronStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.casFeatureSettingsApi !== 'undefined'
}

function readLocalStorageSettings() {
  if (typeof window === 'undefined') {
    return createDefaultSettings()
  }
  try {
    const raw = window.localStorage.getItem(HOME_FEATURE_SETTINGS_STORAGE_KEY)
    if (!raw) {
      return createDefaultSettings()
    }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return createDefaultSettings()
  }
}

function settingsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function persistLocalStorageSettings(nextState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HOME_FEATURE_SETTINGS_STORAGE_KEY, JSON.stringify(nextState))
  } catch {
    // ignore storage write errors
  }
}

function persistSettings(nextState) {
  if (isElectronStorageAvailable()) {
    window.casFeatureSettingsApi.set(nextState).catch(() => {})
    return
  }
  persistLocalStorageSettings(nextState)
}

let state = createDefaultSettings()
let hydrated = false
let hydratePromise = null

function emitChange() {
  listeners.forEach((listener) => listener())
}

function applyHydratedSettings(nextState) {
  state = normalizeSettings(nextState)
  hydrated = true
  emitChange()
}

function hydrateFromStorage() {
  if (hydratePromise) {
    return hydratePromise
  }

  if (!isElectronStorageAvailable()) {
    state = readLocalStorageSettings()
    hydrated = true
    hydratePromise = Promise.resolve()
    return hydratePromise
  }

  hydratePromise = window.casFeatureSettingsApi
    .get()
    .then(async (stored) => {
      if (stored && typeof stored === 'object') {
        applyHydratedSettings(stored)
        return
      }

      const localSettings = readLocalStorageSettings()
      if (!settingsEqual(localSettings, createDefaultSettings())) {
        await window.casFeatureSettingsApi.set(localSettings)
        applyHydratedSettings(localSettings)
        return
      }

      applyHydratedSettings(createDefaultSettings())
    })
    .catch(() => {
      applyHydratedSettings(readLocalStorageSettings())
    })

  return hydratePromise
}

if (typeof window !== 'undefined') {
  hydrateFromStorage()
}

function runAfterHydrated(action) {
  if (hydrated) {
    action()
    return
  }

  hydrateFromStorage().finally(action)
}

function setState(updater) {
  runAfterHydrated(() => {
    const nextState = typeof updater === 'function' ? updater(state) : updater
    state = normalizeSettings(nextState)
    persistSettings(state)
    emitChange()
  })
}

function updateHomeFeatureSettings(patch) {
  setState((previous) => ({ ...previous, ...patch }))
}

function updateIndoorTemperatureVisibility(index, visible) {
  if (!Number.isInteger(index) || index < 0 || index > 4) return
  setState((previous) => {
    const nextIndoorVisibility = [...previous.indoorTemperatureVisibility]
    nextIndoorVisibility[index] = Boolean(visible)
    return {
      ...previous,
      indoorTemperatureVisibility: nextIndoorVisibility,
    }
  })
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useHomeFeatureSettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function setHomeFeatureSettings(patch) {
  updateHomeFeatureSettings(patch)
}

export function setIndoorTemperatureVisibility(index, visible) {
  updateIndoorTemperatureVisibility(index, visible)
}

export function resetHomeFeatureSettings() {
  setState(createDefaultSettings())
}

export function initHomeFeatureSettings() {
  return hydrateFromStorage()
}
