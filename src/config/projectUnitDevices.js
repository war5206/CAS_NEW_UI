import {
  COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID,
  COUPLE_ENERGY_TYPE_NONE_ID,
} from '@/config/couplingEnergyTypes'

export { COUPLE_ENERGY_TYPE_AIR_COOLED_MODULE_ID, COUPLE_ENERGY_TYPE_NONE_ID }
import {
  STANDARD_DEFAULT_HEAT_PUMP_COUNT,
  USE_AIR_COOLED_DEVICE_CODE_REMAP,
} from '@/config/projectProfile'

/** 风冷模块点位起始编号 No31 */
export const AIR_COOLED_MODULE_START_NO = 31

/** 风冷模块最大台数 */
export const AIR_COOLED_MODULE_MAX_COUNT = 50

/** 热泵最大台数 */
export const HEAT_PUMP_MAX_COUNT = 50

/** PLC 热泵总台数（Sys\\FinforWorx\\HPTotalNumber），首页/总览状态轮询范围依据 */
export const LONG_NAME_HP_TOTAL_NUMBER = 'Sys\\FinforWorx\\HPTotalNumber'

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

/** 从实时值映射读取热泵总台数 */
export function resolveHeatPumpCountFromValueMap(valueMap, fallback = STANDARD_DEFAULT_HEAT_PUMP_COUNT) {
  if (!valueMap || typeof valueMap !== 'object') {
    return fallback
  }
  return parseHeatPumpTotalCount(valueMap[LONG_NAME_HP_TOTAL_NUMBER], fallback)
}

/**
 * 根据项目配置生成合法机组编号列表。
 * 标准布局：No1-NoN，耦合能源为风冷模块时追加 No31+
 */
export function buildUnitDeviceIds(heatPumpCount, coupleEnergyTypeId, coupleEnergyCount) {
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

/** 设备参数页状态卡片等窄位文案：热泵1；耦合能源风冷模块显示风冷1 */
export function getUnitCompactDisplayName(id) {
  if (id >= AIR_COOLED_MODULE_START_NO) {
    return `风冷${id - AIR_COOLED_MODULE_START_NO + 1}`
  }
  return `热泵${id}`
}

/**
 * 耦合能源风冷模块点位归一：No31–No42；开启兼容映射时支持 No14–No25。
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

/** 将 No1 / No31 或数字 id 转为界面名称：热泵1、耦合能源风冷模块1 */
export function resolveUnitDisplayLabelFromCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id != null) {
    return getUnitDisplayName(id)
  }
  const text = String(value ?? '').trim()
  return text || '--'
}

export function isHeatPumpModuleDeviceCode(value) {
  const id = parseUnitDeviceCodeLoose(value)
  if (id == null || id >= AIR_COOLED_MODULE_START_NO) {
    return false
  }
  return id >= 1 && id <= HEAT_PUMP_MAX_COUNT
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

/** 首页 / 状态轮询：热泵分组 */
export function getHomeUnitStatusGroups({ heatPumpCount: heatPumpCountOverride } = {}) {
  const heatPumpCount = parseHeatPumpTotalCount(heatPumpCountOverride, STANDARD_DEFAULT_HEAT_PUMP_COUNT)
  return {
    heatPump: {
      id: 'heat-pump',
      label: '热泵机组',
      startNo: 1,
      count: heatPumpCount,
    },
  }
}

/** 热泵总览看板轮询设备编号列表 */
export function resolveBoardStatusDeviceIds(options = {}) {
  return Object.values(getHomeUnitStatusGroups(options)).flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => group.startNo + index),
  )
}
