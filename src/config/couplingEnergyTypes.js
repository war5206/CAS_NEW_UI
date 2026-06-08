/** PLC 耦合能源类型（Sys\\FinforWorx\\OHType） */
export const LONG_NAME_OH_TYPE = 'Sys\\FinforWorx\\OHType'

/** PLC 耦合能源台数（Sys\\FinforWorx\\OHNumber） */
export const LONG_NAME_OH_NUMBER = 'Sys\\FinforWorx\\OHNumber'

export const COUPLING_ENERGY_REALVAL_LONG_NAMES = [LONG_NAME_OH_TYPE, LONG_NAME_OH_NUMBER]

/** 0=无耦合能源，1=电锅炉，2=水源热泵，3=风冷模块，4=燃气锅炉 */
export const COUPLE_ENERGY_TYPE_NONE_ID = '0'
export const COUPLE_ENERGY_TYPE_ELECTRIC_BOILER_ID = '1'
export const COUPLE_ENERGY_TYPE_WATER_SOURCE_HEAT_PUMP_ID = '2'
export const COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID = '3'
export const COUPLE_ENERGY_TYPE_GAS_BOILER_ID = '4'

export const COUPLING_ENERGY_TYPE_OPTIONS = [
  { id: COUPLE_ENERGY_TYPE_ELECTRIC_BOILER_ID, label: '电锅炉' },
  { id: COUPLE_ENERGY_TYPE_GAS_BOILER_ID, label: '燃气锅炉' },
  { id: COUPLE_ENERGY_TYPE_WATER_SOURCE_HEAT_PUMP_ID, label: '水源热泵' },
  { id: COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID, label: '风冷模块' },
  { id: COUPLE_ENERGY_TYPE_NONE_ID, label: '无耦合能源' },
]

export const COUPLING_ENERGY_LABEL_TO_ID = COUPLING_ENERGY_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.label] = item.id
  return acc
}, {})

export const COUPLING_ENERGY_ID_TO_LABEL = COUPLING_ENERGY_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const VALID_TYPE_IDS = new Set(COUPLING_ENERGY_TYPE_OPTIONS.map((item) => item.id))

export function normalizeCouplingEnergyTypeId(rawTypeId) {
  const normalized = String(rawTypeId ?? '').trim()
  if (VALID_TYPE_IDS.has(normalized)) {
    return normalized
  }

  const numeric = Number(normalized)
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 4) {
    return String(Math.round(numeric))
  }

  return COUPLE_ENERGY_TYPE_NONE_ID
}

export function resolveCouplingEnergyTypeLabel({ typeId, typeName } = {}) {
  const normalizedTypeId = normalizeCouplingEnergyTypeId(typeId)
  if (COUPLING_ENERGY_ID_TO_LABEL[normalizedTypeId]) {
    return COUPLING_ENERGY_ID_TO_LABEL[normalizedTypeId]
  }

  const normalizedName = String(typeName ?? '').trim()
  if (COUPLING_ENERGY_LABEL_TO_ID[normalizedName]) {
    return normalizedName
  }

  return COUPLING_ENERGY_ID_TO_LABEL[COUPLE_ENERGY_TYPE_NONE_ID]
}

export function resolveCouplingEnergyTypeId({ typeId, typeName } = {}) {
  const normalizedTypeId = normalizeCouplingEnergyTypeId(typeId)
  if (VALID_TYPE_IDS.has(normalizedTypeId)) {
    return normalizedTypeId
  }

  const normalizedName = String(typeName ?? '').trim()
  if (COUPLING_ENERGY_LABEL_TO_ID[normalizedName]) {
    return COUPLING_ENERGY_LABEL_TO_ID[normalizedName]
  }

  return COUPLE_ENERGY_TYPE_NONE_ID
}

/**
 * 从 queryRealvalByLongNames 的 valueMap 解析耦合能源展示状态
 * @param {Record<string, unknown> | null | undefined} valueMap
 * @returns {{ typeId: string, type: string, count: string } | null}
 */
export function adaptCouplingEnergyFromRealvalMap(valueMap) {
  if (!valueMap || typeof valueMap !== 'object') {
    return null
  }

  const typeId = normalizeCouplingEnergyTypeId(valueMap[LONG_NAME_OH_TYPE])
  const typeLabel = resolveCouplingEnergyTypeLabel({ typeId })
  const rawCount = valueMap[LONG_NAME_OH_NUMBER]
  const parsedCount = Number.parseInt(String(rawCount ?? '').trim(), 10)
  const safeCount = Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 0
  const count = typeId === COUPLE_ENERGY_TYPE_NONE_ID ? '0' : String(safeCount)

  return {
    typeId,
    type: typeLabel,
    count,
  }
}

/**
 * 耦合能源保存下置 payload
 * @param {string} typeId
 * @param {string | number} count
 */
export function toCouplingEnergyRealvalWriteData(typeId, count) {
  const normalizedTypeId = resolveCouplingEnergyTypeId({ typeId })
  const parsedCount = Number.parseInt(String(count ?? '').trim(), 10)
  const safeCount = Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 0
  const normalizedCount = normalizedTypeId === COUPLE_ENERGY_TYPE_NONE_ID ? 0 : safeCount

  return {
    [LONG_NAME_OH_TYPE]: Number(normalizedTypeId),
    [LONG_NAME_OH_NUMBER]: normalizedCount,
  }
}
