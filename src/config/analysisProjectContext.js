/** PLC 项目类型（Sys\FinforWorx\ProjectType）：1=采暖，2=冷暖，3=热水 */
export const LONG_NAME_PROJECT_TYPE = 'Sys\\FinforWorx\\ProjectType'

/** PLC 系统类型（Sys\FinforWorx\SystemType）：1=一次系统，2=二次系统 */
export const LONG_NAME_SYSTEM_TYPE = 'Sys\\FinforWorx\\SystemType'

/** PLC 冷热模式（Sys\FinforWorx\HPTotalRunMode）：1=制热，0=制冷 */
export const LONG_NAME_HP_TOTAL_RUN_MODE = 'Sys\\FinforWorx\\HPTotalRunMode'

export const ANALYSIS_CONTEXT_LONG_NAMES = [
  LONG_NAME_PROJECT_TYPE,
  LONG_NAME_SYSTEM_TYPE,
  LONG_NAME_HP_TOTAL_RUN_MODE,
]

export const PROJECT_TYPE = {
  HEATING: '1',
  HEATING_COOLING: '2',
  HOT_WATER: '3',
}

export const SYSTEM_TYPE = {
  PRIMARY: '1',
  SECONDARY: '2',
}

export const HOT_COLD_MODE = {
  HEATING: '1',
  COOLING: '0',
}

const VALID_PROJECT_TYPE_IDS = new Set(Object.values(PROJECT_TYPE))
const VALID_SYSTEM_TYPE_IDS = new Set(Object.values(SYSTEM_TYPE))

export const COP_TYPE = {
  SYSTEM: 'system-cop',
  HEATING: 'heat-cop',
  COOLING: 'cold-cop',
}

export const HEAT_TYPE = {
  PRIMARY: 'primary-heat',
  SECONDARY: 'secondary-heat',
}

export const COLD_TYPE = {
  PRIMARY: 'primary-cold',
  SECONDARY: 'secondary-cold',
}

export function normalizeProjectTypeId(rawProjectTypeId) {
  const normalized = String(rawProjectTypeId ?? '').trim()
  if (VALID_PROJECT_TYPE_IDS.has(normalized)) {
    return normalized
  }

  const numeric = Number(normalized)
  if (Number.isFinite(numeric) && (numeric === 1 || numeric === 2 || numeric === 3)) {
    return String(Math.round(numeric))
  }

  return PROJECT_TYPE.HEATING
}

export function normalizeSystemTypeId(rawSystemTypeId) {
  const normalized = String(rawSystemTypeId ?? '').trim()
  if (VALID_SYSTEM_TYPE_IDS.has(normalized)) {
    return normalized
  }

  const numeric = Number(normalized)
  if (Number.isFinite(numeric) && (numeric === 1 || numeric === 2)) {
    return String(Math.round(numeric))
  }

  return SYSTEM_TYPE.PRIMARY
}

export function isHeatingCoolingProject(projectTypeId) {
  return normalizeProjectTypeId(projectTypeId) === PROJECT_TYPE.HEATING_COOLING
}

export function isPrimarySystem(systemTypeId) {
  return normalizeSystemTypeId(systemTypeId) === SYSTEM_TYPE.PRIMARY
}

export function normalizeHPColdHotMode(rawMode) {
  const normalized = String(rawMode ?? '').trim()
  if (normalized === '1' || normalized === '0') {
    return normalized
  }

  const numeric = Number(normalized)
  if (Number.isFinite(numeric) && (numeric === 0 || numeric === 1)) {
    return String(Math.round(numeric))
  }

  return HOT_COLD_MODE.HEATING
}

export function isHPHeatingMode(mode) {
  return normalizeHPColdHotMode(mode) === HOT_COLD_MODE.HEATING
}

export function createDefaultAnalysisProjectContext() {
  return {
    projectTypeId: PROJECT_TYPE.HEATING,
    systemTypeId: SYSTEM_TYPE.PRIMARY,
    hpRunMode: HOT_COLD_MODE.HEATING,
    isHeatingCooling: false,
    isPrimarySystem: true,
    isHPHeating: true,
  }
}

/**
 * 从 queryRealvalByLongNames 的 valueMap 解析分析模块项目上下文
 * @param {Record<string, unknown> | null | undefined} valueMap
 */
export function adaptAnalysisProjectContextFromRealvalMap(valueMap) {
  const projectTypeId = normalizeProjectTypeId(valueMap?.[LONG_NAME_PROJECT_TYPE])
  const systemTypeId = normalizeSystemTypeId(valueMap?.[LONG_NAME_SYSTEM_TYPE])
  const hpRunMode = normalizeHPColdHotMode(valueMap?.[LONG_NAME_HP_TOTAL_RUN_MODE])

  return {
    projectTypeId,
    systemTypeId,
    hpRunMode,
    isHeatingCooling: projectTypeId === PROJECT_TYPE.HEATING_COOLING,
    isPrimarySystem: systemTypeId === SYSTEM_TYPE.PRIMARY,
    isHPHeating: hpRunMode === HOT_COLD_MODE.HEATING,
  }
}

export function getCopTypeOptions(projectTypeId) {
  if (isHeatingCoolingProject(projectTypeId)) {
    return [
      { label: '系统COP', value: COP_TYPE.SYSTEM },
      { label: '制热COP', value: COP_TYPE.HEATING },
      { label: '制冷COP', value: COP_TYPE.COOLING },
    ]
  }

  return [{ label: '系统COP', value: COP_TYPE.SYSTEM }]
}

export function getHeatTitleOptions(systemTypeId) {
  if (isPrimarySystem(systemTypeId)) {
    return [{ label: '一次系统制热量', value: HEAT_TYPE.PRIMARY }]
  }

  return [{ label: '二次系统制热量', value: HEAT_TYPE.SECONDARY }]
}

export function getColdTitleOptions(systemTypeId) {
  if (isPrimarySystem(systemTypeId)) {
    return [{ label: '一次系统制冷量', value: COLD_TYPE.PRIMARY }]
  }

  return [{ label: '二次系统制冷量', value: COLD_TYPE.SECONDARY }]
}
