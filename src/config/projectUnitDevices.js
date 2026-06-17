import {
  COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID,
  COUPLE_ENERGY_TYPE_NONE_ID,
} from '@/config/couplingEnergyTypes'

export { COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID, COUPLE_ENERGY_TYPE_NONE_ID }
export { USE_FIXED_UNIT_LAYOUT } from '@/config/projectProfile'
import {
  DAJUYUAN_AIR_COOLED_MODULE_COUNT,
  DAJUYUAN_HEAT_PUMP_COUNT,
  SHOW_AIR_COOLED_AS_STANDALONE_UNITS,
  STANDARD_DEFAULT_HEAT_PUMP_COUNT,
  USE_AIR_COOLED_DEVICE_CODE_REMAP,
  USE_FIXED_UNIT_LAYOUT,
} from '@/config/projectProfile'

/** 风冷模块点位起始编号 No31 */
export const AIR_COOLED_MODULE_START_NO = 31

/** 风冷模块最大台数 */
export const AIR_COOLED_MODULE_MAX_COUNT = 50

/** 热泵最大台数 */
export const HEAT_PUMP_MAX_COUNT = 50

/** PLC 热泵总台数（Sys\\FinforWorx\\HPTotalNumber），标准款首页/总览状态轮询范围依据 */
export const LONG_NAME_HP_TOTAL_NUMBER = 'Sys\\FinforWorx\\HPTotalNumber'

/** 大剧院固定排布：第一排热泵6台；第二排热泵7台；第三/四排风冷各6台（点位 No31-42） */
export const FIXED_UNIT_LAYOUT_ROWS = [
  { row: 1, ids: [1, 2, 3, 4, 5, 6] },
  { row: 2, ids: [7, 8, 9, 10, 11, 12, 13] },
  { row: 3, ids: [31, 32, 33, 34, 35, 36] },
  { row: 4, ids: [37, 38, 39, 40, 41, 42] },
]

export const FIXED_UNIT_DEVICE_IDS = FIXED_UNIT_LAYOUT_ROWS.flatMap((item) => item.ids)

/** 设备参数-热泵模块：仅热泵 No1-13（不含风冷模块 No31+） */
export const FIXED_HEAT_PUMP_DEVICE_IDS = FIXED_UNIT_LAYOUT_ROWS.filter((item) => item.row <= 2).flatMap(
  (item) => item.ids,
)

export const FIXED_AIR_COOLED_MODULE_DEVICE_IDS = FIXED_UNIT_LAYOUT_ROWS.filter((item) => item.row >= 3).flatMap(
  (item) => item.ids,
)

export function getFixedHeatPumpDeviceIds() {
  return [...FIXED_HEAT_PUMP_DEVICE_IDS]
}

export function getFixedHeatPumpDeviceCodes() {
  return getFixedHeatPumpDeviceIds().map((id) => toUnitDeviceCode(id))
}

export function getFixedAirCooledModuleDeviceIds() {
  return [...FIXED_AIR_COOLED_MODULE_DEVICE_IDS]
}

export function getFixedAirCooledModuleDeviceCodes() {
  return getFixedAirCooledModuleDeviceIds().map((id) => toUnitDeviceCode(id))
}

export function isHeatPumpModuleDeviceCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id == null || id >= AIR_COOLED_MODULE_START_NO) {
    return false
  }
  if (USE_FIXED_UNIT_LAYOUT) {
    return FIXED_HEAT_PUMP_DEVICE_IDS.includes(id)
  }
  return id >= 1 && id <= HEAT_PUMP_MAX_COUNT
}

export function isAirCooledModuleDeviceCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id == null || id < AIR_COOLED_MODULE_START_NO) {
    return false
  }
  if (USE_FIXED_UNIT_LAYOUT) {
    return FIXED_AIR_COOLED_MODULE_DEVICE_IDS.includes(id)
  }
  return id >= AIR_COOLED_MODULE_START_NO && id < AIR_COOLED_MODULE_START_NO + AIR_COOLED_MODULE_MAX_COUNT
}

export function buildFixedUnitLayoutSlots(cols, rows = 10) {
  const slots = Array.from({ length: cols * rows }, () => null)
  FIXED_UNIT_LAYOUT_ROWS.forEach(({ row, ids }) => {
    ids.forEach((id, colIndex) => {
      slots[(row - 1) * cols + colIndex] = id
    })
  })
  return slots
}

export function createFixedUnitLayoutState(cols, rows = 10) {
  return {
    slots: buildFixedUnitLayoutSlots(cols, rows),
    pendingIds: [],
    layoutLocked: false,
    numberingDone: false,
    numberingMap: {},
    showOriginalNo: false,
  }
}

export function getFixedUnitDeviceIds() {
  return [...FIXED_UNIT_DEVICE_IDS]
}

export function getFixedUnitDeviceIdSet() {
  return new Set(FIXED_UNIT_DEVICE_IDS)
}

export function getFixedUnitTotalCount() {
  return FIXED_UNIT_DEVICE_IDS.length
}

function clampInt(value, min, max, fallback = min) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isInteger(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(parsed, max))
}

/** 从 HPTotalNumber 点位解析热泵总台数；无效时回退 fallback */
export function parseHeatPumpTotalCount(value, fallback = STANDARD_DEFAULT_HEAT_PUMP_COUNT) {
  return clampInt(value, 1, HEAT_PUMP_MAX_COUNT, fallback)
}

/** 标准款从实时值映射读取热泵总台数；大剧院固定台数 */
export function resolveHeatPumpCountFromValueMap(valueMap, fallback = STANDARD_DEFAULT_HEAT_PUMP_COUNT) {
  if (USE_FIXED_UNIT_LAYOUT) {
    return DAJUYUAN_HEAT_PUMP_COUNT
  }
  if (!valueMap || typeof valueMap !== 'object') {
    return fallback
  }
  return parseHeatPumpTotalCount(valueMap[LONG_NAME_HP_TOTAL_NUMBER], fallback)
}

/**
 * 根据项目配置生成合法机组编号列表。
 * 例：热泵 13 + 风冷 12 → [1..13, 31..42]
 */
export function buildUnitDeviceIds(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount) {
  if (USE_FIXED_UNIT_LAYOUT) {
    return getFixedUnitDeviceIds()
  }
  const hpCount = clampInt(heatPumpCount, 0, HEAT_PUMP_MAX_COUNT, 0)
  const ids = Array.from({ length: hpCount }, (_, index) => index + 1)

  if (String(coupleEnergyTypeId) === COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID) {
    const moduleCount = clampInt(coupleEnergyCount, 0, AIR_COOLED_MODULE_MAX_COUNT, 0)
    for (let index = 0; index < moduleCount; index += 1) {
      ids.push(AIR_COOLED_MODULE_START_NO + index)
    }
  }

  return ids
}

export function buildUnitDeviceIdSet(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount) {
  return new Set(buildUnitDeviceIds(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount))
}

export function getTotalUnitCount(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount) {
  if (USE_FIXED_UNIT_LAYOUT) {
    return getFixedUnitTotalCount()
  }
  return buildUnitDeviceIds(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount).length
}

export function parseUnitDeviceCodeLoose(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }
  if (/^\d+$/.test(text)) {
    const asNumber = Number(text)
    return Number.isInteger(asNumber) ? asNumber : null
  }
  const matched = text.match(/^No0*(\d+)$/i)
  if (!matched) {
    return null
  }
  const asNumber = Number(matched[1])
  return Number.isInteger(asNumber) ? asNumber : null
}

export function parseUnitDeviceCode(value, allowedIdSet) {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }

  let asNumber = null
  if (/^\d+$/.test(text)) {
    asNumber = Number(text)
  } else {
    const matched = text.match(/^No0*(\d+)$/i)
    if (matched) {
      asNumber = Number(matched[1])
    }
  }

  if (!Number.isInteger(asNumber) || !allowedIdSet.has(asNumber)) {
    return null
  }
  return asNumber
}

export function toUnitNoLabel(id) {
  return `No${String(id).padStart(2, '0')}`
}

export function toUnitDeviceCode(id) {
  return `No${id}`
}

export function getUnitDisplayName(id) {
  if (id >= AIR_COOLED_MODULE_START_NO) {
    return `风冷模块${id - AIR_COOLED_MODULE_START_NO + 1}`
  }
  return `热泵${id}`
}

/** 设备参数页状态卡片等窄位文案：风冷1、热泵1 */
export function getUnitCompactDisplayName(id) {
  if (id >= AIR_COOLED_MODULE_START_NO) {
    return `风冷${id - AIR_COOLED_MODULE_START_NO + 1}`
  }
  return `热泵${id}`
}

/**
 * 风冷模块点位 No31–No42；后端下拉偶发用 No14–No25（热泵台数后的连续序号）表示同一批设备。
 */
export function remapAirCooledModuleDeviceCode(value) {
  if (!USE_AIR_COOLED_DEVICE_CODE_REMAP) {
    const id = parseUnitDeviceCodeLoose(value)
    if (id == null) {
      return null
    }
    if (id >= AIR_COOLED_MODULE_START_NO && id <= AIR_COOLED_MODULE_START_NO + AIR_COOLED_MODULE_MAX_COUNT) {
      return toUnitDeviceCode(id)
    }
    return null
  }

  const id = parseUnitDeviceCodeLoose(value)
  if (id == null) {
    return null
  }
  if (id >= AIR_COOLED_MODULE_START_NO && id <= AIR_COOLED_MODULE_START_NO + AIR_COOLED_MODULE_MAX_COUNT) {
    return toUnitDeviceCode(id)
  }
  if (id >= 14 && id <= 25) {
    return toUnitDeviceCode(id - 14 + AIR_COOLED_MODULE_START_NO)
  }
  return null
}

/** 将 No1 / No31 或数字 id 转为界面名称：热泵1、风冷模块1 */
export function resolveUnitDisplayLabelFromCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id != null) {
    return getUnitDisplayName(id)
  }
  const text = String(value ?? '').trim()
  return text || '--'
}

/** 机组排布界面：热泵1-13、风冷模块1-12（保存点位仍为 No1-13 / No31-42） */
export function getFixedUnitLayoutLabel(id) {
  return getUnitDisplayName(id)
}

export function createUnitGridItem(id) {
  return {
    key: `hp-${id}`,
    id,
    label: getUnitDisplayName(id),
    name: getUnitDisplayName(id),
    details: [],
  }
}

export function buildUnitGridItemMap(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount) {
  return new Map(
    buildUnitDeviceIds(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount).map((id) => [
      id,
      createUnitGridItem(id),
    ]),
  )
}

/** 首页 / 状态轮询：按 project profile 决定热泵、风冷模块分组 */
export function getHomeUnitStatusGroups({ heatPumpCount: heatPumpCountOverride } = {}) {
  const heatPumpCount = USE_FIXED_UNIT_LAYOUT
    ? DAJUYUAN_HEAT_PUMP_COUNT
    : parseHeatPumpTotalCount(heatPumpCountOverride, STANDARD_DEFAULT_HEAT_PUMP_COUNT)
  const groups = {
    heatPump: {
      id: 'heat-pump',
      label: '热泵机组',
      startNo: 1,
      count: heatPumpCount,
    },
  }

  if (SHOW_AIR_COOLED_AS_STANDALONE_UNITS) {
    groups.airCooledModule = {
      id: 'air-cooled-module',
      label: '风冷模块机组',
      startNo: AIR_COOLED_MODULE_START_NO,
      count: DAJUYUAN_AIR_COOLED_MODULE_COUNT,
    }
  }

  return groups
}

/** 热泵总览看板轮询设备编号列表 */
export function resolveBoardStatusDeviceIds(options = {}) {
  return Object.values(getHomeUnitStatusGroups(options)).flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => group.startNo + index),
  )
}
