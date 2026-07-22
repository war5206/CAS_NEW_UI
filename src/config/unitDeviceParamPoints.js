import { isOnValue } from '@/utils/realvalMap'
import { FIXED_UNIT_DEVICE_IDS } from './projectUnitDevices'

/** PLC 长名前缀：HeatPump\SJMG\No{编号}\ */
export const UNIT_DEVICE_POINT_PREFIX = 'HeatPump\\SJMG\\'

export const UNIT_DEVICE_STATUS_SUFFIX = {
  OPERATION: 'Machine_Operation',
  DEFROSTING: 'Systematic_Defrosting',
  FAULT: 'Fault_Alarm',
  COMM_STATUS: 'Comm_Status',
}

/** 热泵 / 风冷模块共用 16 项详情（dataKey 与后端 heatPumpData 键一致） */
export const UNIT_DEVICE_PARAM_FIELD_DEFS = [
  { dataKey: '回水温度', suffix: 'TT_ReturnWater', label: '回水温度（℃）', valueType: 'raw' },
  { dataKey: '供水温度', suffix: 'TT_OutletWater', label: '供水温度（℃）', valueType: 'raw' },
  { dataKey: '回差值', suffix: 'Diff_Value', label: '回差值', valueType: 'raw' },
  { dataKey: '制热目标频率上限', suffix: 'HTF_Max', label: '制热目标频率上限（Hz）', valueType: 'raw' },
  { dataKey: '制热设定温度', suffix: 'Heat_Setpoint', label: '制热设定温度（℃）', valueType: 'raw' },
  { dataKey: '制冷设定温度', suffix: 'Cold_Setpoint', label: '制冷设定温度（℃）', valueType: 'raw' },
  { dataKey: '设定模式', suffix: 'Setting_Mode', label: '设定模式', valueType: 'settingMode' },
  { dataKey: '开关机', suffix: 'Poweron', label: '开关机', valueType: 'powerOn' },
  { dataKey: '总故障代码', suffix: 'Master_Fault_Code', label: '总故障代码', valueType: 'raw' },
  { dataKey: '系统1压缩机运行频率', suffix: 'S1_COMP_FREQ', label: '系统1压缩机运行频率（Hz）', valueType: 'raw' },
  { dataKey: '系统1压缩机电流', suffix: 'S1_COMP_A', label: '系统1压缩机电流（A）', valueType: 'raw' },
  { dataKey: '系统2压缩机运行频率', suffix: 'S2_COMP_FREQ', label: '系统2压缩机运行频率（Hz）', valueType: 'raw' },
  { dataKey: '系统2压缩机电流', suffix: 'S2_COMP_A', label: '系统2压缩机电流（A）', valueType: 'raw' },
  { dataKey: '外环境温度', suffix: 'TT_Outdoor', label: '外环境温度（℃）', valueType: 'raw' },
  { dataKey: '累积运行时长', suffix: 'RunTimeHour1', label: '累积运行时长（h）', valueType: 'raw' },
  { dataKey: '持续运行时长', suffix: 'RunTimeHour2', label: '持续运行时长（h）', valueType: 'raw' },
]

export const UNIT_DEVICE_OVERVIEW_METRIC_KEYS = UNIT_DEVICE_PARAM_FIELD_DEFS.map((item) => item.dataKey)

export function getFixedUnitDevicePointNos() {
  return [...FIXED_UNIT_DEVICE_IDS]
}

export function buildUnitDeviceLongName(pointNo, suffix) {
  return `${UNIT_DEVICE_POINT_PREFIX}No${pointNo}\\${suffix}`
}

export function getUnitDeviceStatusLongNames(pointNo) {
  return {
    operation: buildUnitDeviceLongName(pointNo, UNIT_DEVICE_STATUS_SUFFIX.OPERATION),
    defrosting: buildUnitDeviceLongName(pointNo, UNIT_DEVICE_STATUS_SUFFIX.DEFROSTING),
    fault: buildUnitDeviceLongName(pointNo, UNIT_DEVICE_STATUS_SUFFIX.FAULT),
    commStatus: buildUnitDeviceLongName(pointNo, UNIT_DEVICE_STATUS_SUFFIX.COMM_STATUS),
  }
}

export function isUnitDeviceOnValue(value) {
  return isOnValue(value)
}

/** 指标「开关机」：1/"1"→开，0/"0"→关，空值→-- */
export function formatUnitDevicePowerOnValue(rawValue) {
  if (rawValue == null || String(rawValue).trim() === '') {
    return '--'
  }

  const text = String(rawValue).trim()
  if (text === '开' || text === '关') {
    return text
  }
  if (rawValue === 1 || text === '1') {
    return '开'
  }
  if (rawValue === 0 || text === '0') {
    return '关'
  }

  return '--'
}

export function formatUnitDeviceParamValue(valueType, rawValue) {
  const text = String(rawValue ?? '').trim()
  if (!text) {
    return '--'
  }

  switch (valueType) {
    case 'settingMode':
      if (text === '0') return '制冷'
      if (text === '1') return '制热'
      return text
    case 'powerOn':
      return formatUnitDevicePowerOnValue(rawValue)
    default:
      return text
  }
}

export function buildCombinedUnitDeviceStateText({ run = false, defrost = false, fault = false } = {}) {
  if (fault) {
    return '故障'
  }
  if (defrost) {
    return '化霜'
  }
  return run ? '运行' : '待机'
}

export function createUnitDeviceDetailsFromParam(heatPumpData = {}) {
  return UNIT_DEVICE_PARAM_FIELD_DEFS.map(({ dataKey, label, valueType }) => ({
    label,
    value: formatUnitDeviceParamValue(valueType, heatPumpData[dataKey]),
  }))
}
