/** 饼图扇区较多时使用：先走固定高区分色板，超出部分用黄金角色相生成 */
const PIE_COLORS = [
  '#1f99ea',
  '#6840f4',
  '#20c7a2',
  '#ec9b14',
  '#f45d48',
  '#32c5ff',
  '#e84a8c',
  '#7cb342',
  '#ab47bc',
  '#26a69a',
  '#ff7043',
  '#5c6bc0',
  '#8d6e63',
  '#78909c',
  '#d4e157',
  '#ffca28',
  '#29b6f6',
  '#ef5350',
  '#66bb6a',
  '#ba68c8',
  '#ffa726',
  '#42a5f5',
  '#ec407a',
  '#9ccc65',
  '#9575cd',
  '#4dd0e1',
  '#ffb74d',
  '#4fc3f7',
  '#f06292',
  '#aed581',
  '#7986cb',
  '#4db6ac',
  '#ff8a65',
  '#90caf9',
  '#ce93d8',
  '#81c784',
  '#fff176',
  '#64b5f6',
  '#e57373',
  '#a1887f',
  '#b0bec5',
  '#dce775',
  '#ffd54f',
  '#f48fb1',
  '#c5e1a5',
  '#9fa8da',
  '#80cbc4',
]

function pieColorAtIndex(index) {
  if (index < PIE_COLORS.length) {
    return PIE_COLORS[index]
  }
  const hue = (index * 137.508) % 360
  const sat = 52 + ((index * 3) % 28)
  const light = 48 + ((index * 5) % 12)
  return `hsl(${Math.round(hue)}, ${sat}%, ${light}%)`
}

function toText(value, fallback = '') {
  if (value == null || value === '') {
    return fallback
  }
  return String(value)
}

function toNumberOrFallback(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function createDefaultAlarmOverview() {
  return {
    alarmsNumber: 0,
    unhandleAlarmsNumber: 0,
    mostHeatPump: '--',
    mostAlarmType: '--',
  }
}

export function adaptAlarmOverview(rawData) {
  const fallback = createDefaultAlarmOverview()
  const source = rawData?.data ?? rawData ?? {}

  return {
    alarmsNumber: toNumberOrFallback(source?.alarmsNumber, fallback.alarmsNumber),
    unhandleAlarmsNumber: toNumberOrFallback(source?.unhandleAlarmsNumber, fallback.unhandleAlarmsNumber),
    mostHeatPump: toText(source?.mostHeatPump, fallback.mostHeatPump),
    mostAlarmType: toText(source?.mostAlarmType, fallback.mostAlarmType),
  }
}

export function createDefaultAlarmTrend() {
  return {
    xAxis: [],
    series: [],
    xUnit: '',
  }
}

export function adaptAlarmTrend(rawData) {
  const source = rawData?.data ?? rawData ?? {}
  const dateList = Array.isArray(source?.dateList) ? source.dateList : []
  const valueList = Array.isArray(source?.valueList) ? source.valueList : []

  return {
    xAxis: dateList.map((item) => toText(item, '')),
    series: valueList.map((item) => toNumberOrFallback(item, 0)),
    xUnit: toText(source?.xUnit, ''),
  }
}

export function createDefaultAlarmCategory() {
  return {
    xAxis: [],
    series: [],
  }
}

export function adaptAlarmCategory(rawData) {
  const source = rawData?.data ?? rawData ?? {}
  const x = Array.isArray(source?.x) ? source.x : []
  const y = Array.isArray(source?.y) ? source.y : []

  return {
    xAxis: x.map((item) => toText(item, '')),
    series: y.map((item) => toNumberOrFallback(item, 0)),
  }
}

export function createDefaultAlarmDistribution() {
  return {
    pieData: [],
  }
}

export function adaptAlarmDistribution(rawData) {
  const source = rawData?.data ?? rawData ?? {}
  const pieList = Array.isArray(source?.pieList) ? source.pieList : []

  return {
    pieData: pieList.map((item, index) => ({
      name: toText(item?.name, '--'),
      value: toNumberOrFallback(item?.value, 0),
      color: pieColorAtIndex(index),
    })),
  }
}

export function createDefaultHeatPumpSelectOptions() {
  return [{ value: '', label: '全部' }]
}

export function adaptHeatPumpSelectOptions(rawData) {
  const fallback = createDefaultHeatPumpSelectOptions()
  const source = rawData?.data ?? rawData ?? {}
  const selectList = Array.isArray(source?.selectList) ? source.selectList : []

  if (selectList.length === 0) {
    return fallback
  }

  return selectList.map((item) => ({
    value: toText(item?.value, ''),
    label: toText(item?.title, '--'),
  }))
}
