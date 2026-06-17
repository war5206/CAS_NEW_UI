import {
  UNIT_DEVICE_PARAM_FIELD_DEFS,
  buildUnitDeviceLongName,
  formatUnitDeviceParamValue,
} from '@/config/unitDeviceParamPoints'
import {
  AIR_COOLED_MODULE_START_NO,
  getFixedAirCooledModuleDeviceIds,
  getFixedHeatPumpDeviceIds,
  getUnitDisplayName,
  parseUnitDeviceCodeLoose,
  remapAirCooledModuleDeviceCode,
  toUnitDeviceCode,
} from '@/config/projectUnitDevices'
import { STANDARD_DEFAULT_HEAT_PUMP_COUNT, USE_FIXED_UNIT_LAYOUT } from '@/config/projectProfile'

function toText(value, fallback = '') {
  if (value == null || value === '') return fallback
  return String(value)
}

function toNumberOrFallback(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveChartType(unit, label) {
  const text = `${toText(unit)} ${toText(label)}`.toLowerCase()
  if (text.includes('压') || text.includes('kpa')) return 'pressure'
  if (text.includes('温') || text.includes('℃')) return 'temperature'
  if (text.includes('%')) return 'humidity'
  if (text.includes('db') || text.includes('噪')) return 'noise'
  if (text.includes('角')) return 'angle'
  if (text.includes('档')) return 'gear'
  return 'enum'
}

function adaptMetricList(list = []) {
  return list.map((item, index) => ({
    key: `${toText(item?.longName, `ops-${index}`)}-${index}`,
    label: toText(item?.name, '--'),
    value: toText(item?.value, '--'),
    unit: toText(item?.unit, ''),
    longName: toText(item?.longName, ''),
    chartType: resolveChartType(item?.unit, item?.name),
  }))
}

export function createDefaultOpsSystemStateMetrics() {
  return []
}

export function adaptOpsSystemStateMetrics(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.dataList) ? source.dataList : []
  return adaptMetricList(list)
}

function extractMetricUnitFromLabel(label) {
  const match = String(label ?? '').match(/（([^）]+)）/)
  return match ? match[1] : ''
}

function resolveOpsUnitDeviceChartType(def) {
  if (def.valueType === 'settingMode' || def.valueType === 'powerOn') {
    return 'enum'
  }
  const label = def.label
  if (label.includes('故障')) return 'fault'
  if (label.includes('Hz')) return 'frequency'
  if (label.includes('电流')) return 'current'
  if (label.includes('运行时长')) return 'duration'
  if (label.includes('℃')) return 'temperature'
  return 'enum'
}

function buildFixedOpsUnitOptions(deviceIds) {
  return deviceIds.map((id) => ({
    value: toUnitDeviceCode(id),
    label: getUnitDisplayName(id),
  }))
}

function resolveOpsHeatPumpDeviceIds() {
  if (USE_FIXED_UNIT_LAYOUT) {
    return getFixedHeatPumpDeviceIds()
  }
  return Array.from({ length: STANDARD_DEFAULT_HEAT_PUMP_COUNT }, (_, index) => index + 1)
}

export function createDefaultOpsHeatPumpUnitOptions() {
  return buildFixedOpsUnitOptions(resolveOpsHeatPumpDeviceIds())
}

export function createDefaultOpsAirCooledUnitOptions() {
  return buildFixedOpsUnitOptions(getFixedAirCooledModuleDeviceIds())
}

export function createDefaultOpsHeatPumpOptions() {
  return [{ value: 'No1', label: '热泵1' }]
}

export function adaptOpsHeatPumpOptions(rawData) {
  if (USE_FIXED_UNIT_LAYOUT) {
    return createDefaultOpsHeatPumpUnitOptions()
  }

  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.heatPump) ? source.heatPump : []
  if (!list.length) {
    return createDefaultOpsHeatPumpOptions()
  }

  return list
    .map((item, index) => {
      const codeText = toText(item?.code, `No${index + 1}`)
      const unitId = parseUnitDeviceCodeLoose(codeText) ?? index + 1
      if (unitId >= AIR_COOLED_MODULE_START_NO) {
        return null
      }
      return {
        value: codeText,
        label: toText(item?.name, `热泵${unitId}`),
        row: toNumberOrFallback(item?.row, 1),
        column: toNumberOrFallback(item?.column, 1),
      }
    })
    .filter(Boolean)
}

export function createDefaultOpsHeatPumpSingleMetrics() {
  return []
}

export function adaptOpsHeatPumpSingleMetrics(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.heatPumpData) ? source.heatPumpData : []
  return adaptMetricList(list)
}

export function createDefaultOpsUnitDeviceMetrics() {
  return []
}

export function adaptOpsUnitDeviceMetrics(rawData, deviceCode) {
  const source = rawData?.data ?? rawData
  const inner = source?.data ?? source ?? {}
  const heatPumpData = inner?.heatPumpData ?? {}
  const pointNo = parseUnitDeviceCodeLoose(deviceCode)
  if (pointNo == null) {
    return createDefaultOpsUnitDeviceMetrics()
  }

  return UNIT_DEVICE_PARAM_FIELD_DEFS.map((def) => {
    const value = formatUnitDeviceParamValue(def.valueType, heatPumpData[def.dataKey])
    const unit = extractMetricUnitFromLabel(def.label)
    return {
      key: `${deviceCode}-${def.suffix}`,
      label: def.label.replace(/（[^）]+）/g, ''),
      value,
      unit,
      longName: buildUnitDeviceLongName(pointNo, def.suffix),
      chartType: resolveOpsUnitDeviceChartType(def),
    }
  })
}


export function createDefaultOpsSystemConfigMetrics() {
  return []
}

export function adaptOpsSystemConfigMetrics(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.dataList) ? source.dataList : []
  return adaptMetricList(list)
}

export function createDefaultOpsCurveData() {
  return []
}

export function adaptOpsCurveData(rawData) {
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const x = Array.isArray(source?.x) ? source.x : []
  const y = Array.isArray(source?.y) ? source.y : []
  const length = Math.min(x.length, y.length)
  return Array.from({ length }, (_, index) => ({
    label: toText(x[index], '--'),
    value: toNumberOrFallback(y[index], 0),
  }))
}

export function createDefaultOpsSystemType() {
  return '1'
}

export function adaptOpsSystemType(rawData) {
  const source = rawData?.data ?? rawData
  return toText(source?.systemType, '1')
}

export function createDefaultOpsDeviceRows() {
  return []
}

export function adaptOpsDeviceRows(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source) ? source : []
  return list.map((item, index) => ({
    id: `${toText(item?.tag_long_name_zero, `row-${index}`)}-${index}`,
    name: toText(item?.device_name, '--'),
    runtime: toNumberOrFallback(item?.value, 0),
    health: toText(item?.status, '--'),
    zeroLongName: toText(item?.tag_long_name_zero, ''),
  }))
}

/** 后端偶发用热泵14-25 表示风冷模块1-12，统一归一到 No31-42 */
function normalizeOpsDevicePointNo(pointNo) {
  if (pointNo >= 14 && pointNo <= 25) {
    return pointNo - 14 + AIR_COOLED_MODULE_START_NO
  }
  return pointNo
}

/** 从运维设备管理行解析机组点位编号（No1-13 / No31-42） */
export function resolveOpsDeviceRowPointNo(row) {
  const longName = toText(row?.zeroLongName, '')
  const fromLongName = longName.match(/\\No0*(\d+)\\/i)
  if (fromLongName) {
    const remapped = remapAirCooledModuleDeviceCode(`No${fromLongName[1]}`)
    const parsed = parseUnitDeviceCodeLoose(remapped ?? `No${fromLongName[1]}`)
    if (parsed != null) {
      return normalizeOpsDevicePointNo(parsed)
    }
  }

  const name = toText(row?.name, '').trim()
  const heatPumpMatch = name.match(/^热泵(\d+)$/)
  if (heatPumpMatch) {
    return normalizeOpsDevicePointNo(Number(heatPumpMatch[1]))
  }

  const airCooledMatch = name.match(/^风冷模块(\d+)$/)
  if (airCooledMatch) {
    return AIR_COOLED_MODULE_START_NO + Number(airCooledMatch[1]) - 1
  }

  return null
}

/** 按点位展示名称：No31→风冷模块1，No42→风冷模块12；No1-13→热泵1-13 */
export function formatOpsDeviceRowDisplayName(row) {
  const pointNo = resolveOpsDeviceRowPointNo(row)
  if (pointNo == null) {
    return toText(row?.name, '--')
  }
  return getUnitDisplayName(pointNo)
}

export function enrichOpsDeviceRowDisplayName(row) {
  return {
    ...row,
    name: formatOpsDeviceRowDisplayName(row),
  }
}

export function filterOpsDeviceRowsByPointNos(rows, allowedPointNos) {
  const allowedSet = new Set(allowedPointNos)
  return rows
    .filter((row) => {
      const pointNo = resolveOpsDeviceRowPointNo(row)
      return pointNo != null && allowedSet.has(pointNo)
    })
    .map(enrichOpsDeviceRowDisplayName)
    .sort((left, right) => {
      const leftNo = resolveOpsDeviceRowPointNo(left) ?? 0
      const rightNo = resolveOpsDeviceRowPointNo(right) ?? 0
      return leftNo - rightNo
    })
}
