export {
  COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID,
  COUPLE_ENERGY_TYPE_NONE_ID,
} from '@/config/couplingEnergyTypes'

/** 风冷模块点位起始编号 No31 */
export const AIR_COOLED_MODULE_START_NO = 31

/** 风冷模块最大台数 */
export const AIR_COOLED_MODULE_MAX_COUNT = 50

/** 热泵最大台数 */
export const HEAT_PUMP_MAX_COUNT = 50

/** 非标项目：机组排布固定写死（不依赖耦合能源配置 / 智能扫描） */
export const USE_FIXED_UNIT_LAYOUT = true

/** 第一排热泵6台；第二排热泵7台；第三/四排风冷各6台（点位 No31-42） */
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
  return FIXED_HEAT_PUMP_DEVICE_IDS.includes(id)
}

export function isAirCooledModuleDeviceCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id == null || id < AIR_COOLED_MODULE_START_NO) {
    return false
  }
  return FIXED_AIR_COOLED_MODULE_DEVICE_IDS.includes(id)
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
