import {
  HEAT_PUMP_GRID_ITEMS,
  HEAT_PUMP_STATUS,
  getHeatPumpStatusSummary,
} from '@/config/homeHeatPumps'

const DEFAULT_TEMPERATURE_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const DEFAULT_SUPPLY_DATA = [42, 43, 44, 38, 37, 42, 43, 40, 36, 35]
const DEFAULT_RETURN_DATA = [31, 32, 33, 31, 30.5, 30.8, 31, 30.7, 30.2, 28]
const DEFAULT_TARGET_DATA = [31, 31.4, 31.8, 30.8, 30.9, 31, 30.8, 31, 31.2, 32]

function toNumberOrFallback(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toText(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }

  return String(value)
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return fallback
}

function normalizeHeatPumpStatus(value) {
  const normalizedValue = String(value || '').toLowerCase()

  if (['running', 'run', '1'].includes(normalizedValue)) return HEAT_PUMP_STATUS.RUNNING
  if (['malfunction', 'fault', 'error', '3'].includes(normalizedValue)) return HEAT_PUMP_STATUS.MALFUNCTION
  if (['defrosting', 'defrost', '2'].includes(normalizedValue)) return HEAT_PUMP_STATUS.DEFROSTING
  return HEAT_PUMP_STATUS.SHUTDOWN
}

function buildFallbackLoopPumpItems() {
  return [
    { name: '水泵一', status: '运行中', tone: 'running' },
    { name: '水泵二', status: '已关闭', tone: 'off' },
    { name: '水泵三', status: '有故障', tone: 'fault' },
  ]
}

function buildHeatPumpChartData(summary) {
  return [
    { name: '运行', value: summary.running, color: ['#3B9EFF', '#1F5FB8'] },
    { name: '待机', value: summary.shutdown, color: ['#9FAABD', '#69778E'] },
    { name: '化霜', value: summary.defrosting, color: ['#F4CE52', '#A77A1F'] },
    { name: '故障', value: summary.malfunction, color: ['#FF671E', '#A93600'] },
  ]
}

function adaptLoopPumpItems(items, fallbackItems) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallbackItems
  }

  return items.map((item, index) => {
    const tone = item?.tone || (item?.status === '运行中' ? 'running' : item?.status === '有故障' ? 'fault' : 'off')
    return {
      name: toText(item?.name, `水泵${index + 1}`),
      status: toText(item?.status, tone === 'running' ? '运行中' : tone === 'fault' ? '有故障' : '已关闭'),
      tone,
    }
  })
}

function adaptHeatPumpItems(items, fallbackItems) {
  if (!Array.isArray(items) || items.length === 0) {
    return fallbackItems
  }

  return items.map((item, index) => ({
    ...fallbackItems[index % fallbackItems.length],
    ...item,
    status: normalizeHeatPumpStatus(item?.status),
    label: toText(item?.label, fallbackItems[index % fallbackItems.length]?.label ?? String(index + 1).padStart(2, '0')),
    name: toText(item?.name, `热泵${index + 1}`),
    details: Array.isArray(item?.details) ? item.details : fallbackItems[index % fallbackItems.length]?.details ?? [],
  }))
}

export function createDefaultHomeOverview() {
  const heatPumpItems = HEAT_PUMP_GRID_ITEMS
  const heatPumpSummary = getHeatPumpStatusSummary(heatPumpItems)
  const loopPumpItems = buildFallbackLoopPumpItems()

  return {
    fetchedAt: null,
    mode: {
      name: '智能模式运行中',
      savedCost: '222.7',
      ambientTempText: '-2.1C',
    },
    cost: {
      note: '注：费用结算自 2026-01-15 至今',
      month: '108.13',
      today: '7.33',
      yesterday: '8.12',
    },
    system: {
      heatPumpSummary,
      outdoorTemp: '-2.1',
      condensatePipeTemp: '-2.1',
      heatTracingEnabled: false,
      couplingEnergyEnabled: true,
      waterPumpEnabled: true,
      supplyTemp: '-2.1',
      supplyPressure: '-2.1',
      returnPressure: '-2.1',
      returnTemp: '-2.1',
      circulationPumps: loopPumpItems,
      drainValveOpen: true,
      pressureTankOpen: true,
      pressureValveOpen: true,
      makeupPumps: [
        { name: '水泵一', status: '运行中', tone: 'running' },
        { name: '水泵二', status: '待机', tone: 'off' },
      ],
      waterTankLevel: '50',
    },
    temperature: {
      labels: DEFAULT_TEMPERATURE_LABELS,
      supplyData: DEFAULT_SUPPLY_DATA,
      returnData: DEFAULT_RETURN_DATA,
      targetData: DEFAULT_TARGET_DATA,
    },
    deviceStatus: {
      heatPumpData: buildHeatPumpChartData(heatPumpSummary),
      loopPumpItems,
    },
    heatPumpItems,
  }
}

export function adaptHomeOverview(rawData) {
  const fallback = createDefaultHomeOverview()
  // 处理统一返回结构 { code, data, msg, success }
  const responseData = rawData?.data ?? rawData
  const source = responseData?.data ?? responseData ?? {}
  const systemSource = source.system ?? {}
  const modeSource = source.mode ?? {}
  const costSource = source.cost ?? {}
  const temperatureSource = source.temperature ?? {}
  const heatPumpItems = adaptHeatPumpItems(source.heatPumpItems, fallback.heatPumpItems)
  const summarySource = source.heatPumpSummary ?? systemSource.heatPumpSummary ?? getHeatPumpStatusSummary(heatPumpItems)
  const loopPumpItems = adaptLoopPumpItems(source.loopPumpItems ?? systemSource.circulationPumps, fallback.deviceStatus.loopPumpItems)

  const heatPumpSummary = {
    running: toNumberOrFallback(summarySource.running, fallback.system.heatPumpSummary.running),
    shutdown: toNumberOrFallback(summarySource.shutdown, fallback.system.heatPumpSummary.shutdown),
    defrosting: toNumberOrFallback(summarySource.defrosting, fallback.system.heatPumpSummary.defrosting),
    malfunction: toNumberOrFallback(summarySource.malfunction, fallback.system.heatPumpSummary.malfunction),
  }

  return {
    fetchedAt: source.fetchedAt ?? rawData?.fetchedAt ?? null,
    mode: {
      name: toText(modeSource.name, fallback.mode.name),
      savedCost: toText(modeSource.savedCost, fallback.mode.savedCost),
      ambientTempText: toText(modeSource.ambientTempText, fallback.mode.ambientTempText),
    },
    cost: {
      note: toText(costSource.note, fallback.cost.note),
      month: toText(costSource.month, fallback.cost.month),
      today: toText(costSource.today, fallback.cost.today),
      yesterday: toText(costSource.yesterday, fallback.cost.yesterday),
    },
    system: {
      heatPumpSummary,
      outdoorTemp: toText(systemSource.outdoorTemp, fallback.system.outdoorTemp),
      condensatePipeTemp: toText(systemSource.condensatePipeTemp, fallback.system.condensatePipeTemp),
      heatTracingEnabled: toBoolean(systemSource.heatTracingEnabled, fallback.system.heatTracingEnabled),
      couplingEnergyEnabled: toBoolean(systemSource.couplingEnergyEnabled, fallback.system.couplingEnergyEnabled),
      waterPumpEnabled: toBoolean(systemSource.waterPumpEnabled, fallback.system.waterPumpEnabled),
      supplyTemp: toText(systemSource.supplyTemp, fallback.system.supplyTemp),
      supplyPressure: toText(systemSource.supplyPressure, fallback.system.supplyPressure),
      returnPressure: toText(systemSource.returnPressure, fallback.system.returnPressure),
      returnTemp: toText(systemSource.returnTemp, fallback.system.returnTemp),
      circulationPumps: loopPumpItems,
      drainValveOpen: toBoolean(systemSource.drainValveOpen, fallback.system.drainValveOpen),
      pressureTankOpen: toBoolean(systemSource.pressureTankOpen, fallback.system.pressureTankOpen),
      pressureValveOpen: toBoolean(systemSource.pressureValveOpen, fallback.system.pressureValveOpen),
      makeupPumps: adaptLoopPumpItems(systemSource.makeupPumps, fallback.system.makeupPumps),
      waterTankLevel: toText(systemSource.waterTankLevel, fallback.system.waterTankLevel),
    },
    temperature: {
      labels: Array.isArray(temperatureSource.labels) && temperatureSource.labels.length > 0 ? temperatureSource.labels : fallback.temperature.labels,
      supplyData: Array.isArray(temperatureSource.supplyData) && temperatureSource.supplyData.length > 0 ? temperatureSource.supplyData : fallback.temperature.supplyData,
      returnData: Array.isArray(temperatureSource.returnData) && temperatureSource.returnData.length > 0 ? temperatureSource.returnData : fallback.temperature.returnData,
      targetData: Array.isArray(temperatureSource.targetData) && temperatureSource.targetData.length > 0 ? temperatureSource.targetData : fallback.temperature.targetData,
    },
    deviceStatus: {
      heatPumpData: buildHeatPumpChartData(heatPumpSummary),
      loopPumpItems,
    },
    heatPumpItems,
  }
}
