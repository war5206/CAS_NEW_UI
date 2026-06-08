/** PLC 主板类型（Sys\FinforWorx\HP_Mainboard_Model）：1=精创主板，2=自制定频，3=自制变频 */
export const LONG_NAME_HP_MAINBOARD_MODEL = 'Sys\\FinforWorx\\HP_Mainboard_Model'

export const MAINBOARD_REALVAL_LONG_NAMES = [LONG_NAME_HP_MAINBOARD_MODEL]

export const MAINBOARD_OPTIONS = [
  { value: '1', label: '精创主板' },
  { value: '2', label: '自制定频' },
  { value: '3', label: '自制变频' },
]

export const MAINBOARD_OPTIONS_MAP = MAINBOARD_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

const VALID_MAINBOARD_IDS = new Set(MAINBOARD_OPTIONS.map((item) => item.value))
const DEFAULT_MAINBOARD_ID = MAINBOARD_OPTIONS[0]?.value ?? '1'

export function normalizeMainboardModelId(rawModelId) {
  const normalized = String(rawModelId ?? '').trim()
  if (VALID_MAINBOARD_IDS.has(normalized)) {
    return normalized
  }

  const numeric = Number(normalized)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 3) {
    return String(Math.round(numeric))
  }

  return DEFAULT_MAINBOARD_ID
}

/**
 * 从 queryRealvalByLongNames 的 valueMap 解析主板类型
 * @param {Record<string, unknown> | null | undefined} valueMap
 * @returns {{ value: string } | null}
 */
export function adaptMainboardFromRealvalMap(valueMap) {
  if (!valueMap || typeof valueMap !== 'object') {
    return null
  }

  return {
    value: normalizeMainboardModelId(valueMap[LONG_NAME_HP_MAINBOARD_MODEL]),
  }
}

/**
 * 主板类型保存下置 payload
 * @param {string | number} modelId
 */
export function toMainboardRealvalWriteData(modelId) {
  const normalizedId = normalizeMainboardModelId(modelId)
  return {
    [LONG_NAME_HP_MAINBOARD_MODEL]: Number(normalizedId),
  }
}
