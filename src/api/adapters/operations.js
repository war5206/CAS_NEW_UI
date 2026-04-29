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

export function createDefaultOpsHeatPumpOptions() {
  return [{ value: 'No1', label: '热泵1' }]
}

export function adaptOpsHeatPumpOptions(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.heatPump) ? source.heatPump : []
  if (!list.length) return createDefaultOpsHeatPumpOptions()
  return list.map((item, index) => ({
    value: toText(item?.code, `No${index + 1}`),
    label: toText(item?.name, `热泵${index + 1}`),
    row: toNumberOrFallback(item?.row, 1),
    column: toNumberOrFallback(item?.column, 1),
  }))
}

export function createDefaultOpsHeatPumpSingleMetrics() {
  return []
}

export function adaptOpsHeatPumpSingleMetrics(rawData) {
  const source = rawData?.data ?? rawData
  const list = Array.isArray(source?.heatPumpData) ? source.heatPumpData : []
  return adaptMetricList(list)
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
  const source = rawData?.data ?? rawData
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
